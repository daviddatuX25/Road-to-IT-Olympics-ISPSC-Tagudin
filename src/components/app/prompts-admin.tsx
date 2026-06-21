'use client'

import { api } from '@/lib/api-client'
import { useEffect, useState, useTransition } from 'react'
import { Loader2, Sliders, Save, Info, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function PromptsAdmin() {
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof api.listSystemPromptTemplatesAction>> | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateText, setTemplateText] = useState('')
  const [isPending, startTransition] = useTransition()

  async function load() {
    try {
      const ts = await api.listSystemPromptTemplatesAction()
      setTemplates(ts)
      if (ts.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(ts[0].id)
        setTemplateText(ts[0].template)
      } else if (selectedTemplateId) {
        const found = ts.find(t => t.id === selectedTemplateId)
        if (found) setTemplateText(found.template)
      }
    } catch (err: any) {
      toast.error('Failed to load prompt templates: ' + err.message)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId)

  const handleSelect = (id: string) => {
    setSelectedTemplateId(id)
    const found = templates?.find(t => t.id === id)
    if (found) {
      setTemplateText(found.template)
    }
  }

  const handleSave = () => {
    if (!selectedTemplateId) return
    startTransition(async () => {
      try {
        await api.updateSystemPromptTemplateAction(selectedTemplateId, templateText)
        toast.success('Prompt template updated successfully!')
        await load()
      } catch (err: any) {
        toast.error('Failed to save template: ' + err.message)
      }
    })
  }

  if (!templates) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Left panel - template selector list */}
      <div className="md:col-span-1 space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sliders className="size-4 text-primary" /> System Prompts
            </CardTitle>
            <CardDescription className="text-xs">
              Milestone tutoring, rubrics, and candidate analysis configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {templates.map(t => {
                const active = t.id === selectedTemplateId
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    <div className="truncate">{t.name}</div>
                    <div className={`text-[10px] truncate font-normal mt-0.5 ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {t.description || 'No description provided'}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right panel - editor */}
      <div className="md:col-span-3">
        {selectedTemplate ? (
          <Card className="shadow-sm h-full flex flex-col">
            <CardHeader className="border-b pb-4 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Edit Template: <span className="text-primary font-semibold">{selectedTemplate.name}</span>
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {selectedTemplate.description || 'System prompt configuration.'}
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={isPending} size="sm" className="shadow-sm">
                {isPending ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <Save className="size-4 mr-1" />
                )}
                Save template
              </Button>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col space-y-4">
              {selectedTemplate.name === 'candidate_evaluation' && (
                <div className="rounded-lg border bg-amber-500/10 border-amber-500/20 p-4 text-xs text-amber-600 dark:text-amber-400 space-y-2">
                  <p className="font-semibold flex items-center gap-1">
                    <Info className="size-3.5" /> Interpolated Placeholder Rules
                  </p>
                  <p className="leading-relaxed">
                    This prompt uses double curly-brace placeholders replaced dynamically on evaluation:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
                    <li><strong className="text-foreground">{"{{candidate_name}}"}</strong> - Resolves to &apos;a candidate pair&apos; or &apos;a candidate&apos;</li>
                    <li><strong className="text-foreground">{"{{domain_name}}"}</strong> - The target domain name (e.g. &apos;Java Programming&apos;)</li>
                    <li><strong className="text-foreground">{"{{domain_description}}"}</strong> - Domain contextual information</li>
                    <li><strong className="text-foreground">{"{{contest_format}}"}</strong> - Track contest formats</li>
                    <li><strong className="text-foreground">{"{{partner_rules}}"}</strong> - Rules governing roles/coaching note format</li>
                    <li><strong className="text-foreground">{"{{candidate_identity}}"}</strong> - Student nickname, name, and student ID list</li>
                    <li><strong className="text-foreground">{"{{practice_data}}"}</strong> - Diagnostic data from active season submissions</li>
                    <li><strong className="text-foreground">{"{{mock_data}}"}</strong> - Mock contest eligibility gates</li>
                    <li><strong className="text-foreground">{"{{basis}}"}</strong> - Evaluation basis mode (&apos;practice_only&apos; etc.)</li>
                    <li><strong className="text-foreground">{"{{basis_guidelines}}"}</strong> - AI weight guidance instructions</li>
                    <li><strong className="text-foreground">{"{{partner_output_format}}"}</strong> - Complementarity &amp; Role-Assignment schema extensions</li>
                  </ul>
                </div>
              )}

              <div className="flex-1 flex flex-col space-y-2">
                <Label htmlFor="templateText" className="text-xs font-semibold">Prompt Body Template</Label>
                <Textarea
                  id="templateText"
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  className="flex-1 min-h-[350px] font-mono text-xs leading-relaxed p-4"
                  placeholder="Paste system prompt instructions here..."
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full border border-dashed rounded-lg flex flex-col items-center justify-center py-16 text-center">
            <Sliders className="size-8 text-muted-foreground animate-pulse mb-3" />
            <p className="text-sm font-medium">No Prompt Template Selected</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Select a template from the left list to review and modify its configuration.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
