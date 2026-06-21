'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Award, RotateCcw, ArrowRight, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Question {
  id: number
  category: string
  question: string
  options: { [key: string]: string }
  answer: string
  explanation: string
}

const QUESTION_BANK: Question[] = [
  {
    id: 1,
    category: 'The Wall',
    question: 'What decides who represents ISPSC in the IT Olympics?',
    options: {
      A: 'Proctored mock scores and official selections',
      B: 'AI scores on milestone submissions',
      C: 'Your practice streak',
      D: 'Random choice by the domain captain',
    },
    answer: 'A',
    explanation: 'The core rule of RIO is that practice builds the skills, but proctored mock scrimmages under strict conditions are what decide final selections.',
  },
  {
    id: 2,
    category: 'Milestones',
    question: 'Can a Domain Captain edit a milestone once it has a student submission?',
    options: {
      A: 'No, milestones lock automatically once they have any submission',
      B: 'Yes, but only if they delete the student\'s submission first',
      C: 'Yes, they can edit milestones at any time',
      D: 'Only administrators can do this',
    },
    answer: 'A',
    explanation: 'To preserve audit integrity, milestones lock automatically once they have any submission.',
  },
  {
    id: 3,
    category: 'Streaks',
    question: 'How often does the streak window reset?',
    options: {
      A: 'Weekly (Monday to Sunday)',
      B: 'Daily at midnight',
      C: 'Monthly',
      D: 'It never resets',
    },
    answer: 'A',
    explanation: 'Streaks are tracked on a weekly basis, encouraging consistent training activity each week.',
  },
  {
    id: 4,
    category: 'Modes',
    question: 'Which milestone mode feeds the public assessment leaderboard?',
    options: {
      A: 'Assessment Mode',
      B: 'Tutor Mode',
      C: 'Journal Mode',
      D: 'All of the above',
    },
    answer: 'A',
    explanation: 'Only Assessment Mode submissions (where you receive a strict score out of 100 without immediate AI guidance) feed the main leaderboard.',
  },
  {
    id: 5,
    category: 'Roles',
    question: 'Which role can approve or reject team selections in ALL domains?',
    options: {
      A: 'Admin or Instructor',
      B: 'Domain Captain',
      C: 'Student',
      D: 'Only the IT Olympics Director',
    },
    answer: 'A',
    explanation: 'Instructors and Admins have global select/remove privileges. Domain Captains are limited to their assigned domains.',
  },
  {
    id: 6,
    category: 'Domains',
    question: 'Which of the following contest domains is a pair-based track?',
    options: {
      A: 'Java Programming',
      B: 'Web Development',
      C: 'Database Systems',
      D: 'Python Scripting',
    },
    answer: 'A',
    explanation: 'Java Programming and Quiz Bee are pair-based domains, where candidates train and compete as duos.',
  },
  {
    id: 7,
    category: 'Platform',
    question: 'What is the purpose of the \'Leading Candidates\' panel?',
    options: {
      A: 'To rank trainees by mock scores and streaks to suggest optimal teams/pairs',
      B: 'To automatically select the final team without human input',
      C: 'To display public student rankings',
      D: 'To edit student details',
    },
    answer: 'A',
    explanation: 'Leading Candidates ranks student pairs and individuals dynamically based on proctored mocks and practice streaks to help staff make selection decisions.',
  },
  {
    id: 8,
    category: 'Community',
    question: 'What is the recommended action if your account approval is taking long?',
    options: {
      A: 'Join the Discord Server and message/ping an admin',
      B: 'Create a second account with a different Student ID',
      C: 'Email the ISPSC Registrar',
      D: 'Wait silently',
    },
    answer: 'A',
    explanation: 'Trainees can join the community Discord immediately to contact administrators for quick account approvals.',
  },
  {
    id: 9,
    category: 'Milestones',
    question: 'What should you copy and paste into your local LLM (ChatGPT/Claude/Gemini) to start a milestone?',
    options: {
      A: 'The system prompt blueprint provided in the milestone details',
      B: 'The entire index page',
      C: 'The database schema',
      D: 'Your previous submission\'s source code',
    },
    answer: 'A',
    explanation: 'Milestones provide customized prompt blueprints designed to act as interactive tutors or strict assessors when pasted into LLMs.',
  },
  {
    id: 10,
    category: 'Modes',
    question: 'What is the primary characteristic of Tutor Mode?',
    options: {
      A: 'The AI tutor walks you through step-by-step, helping you learn without scoring',
      B: 'The AI assigns a grade out of 100 that goes directly to the leaderboard',
      C: 'It is a proctored, high-stakes exam',
      D: 'It is for staff only',
    },
    answer: 'A',
    explanation: 'Tutor Mode is designed for sandbox learning. The AI helper guides you and reviews your work without affecting your competitive standings.',
  },
  {
    id: 11,
    category: 'Modes',
    question: 'In Journal Mode, what are you asked to submit?',
    options: {
      A: 'A text reflection and optionally an AI chat share link',
      B: 'A zip file of your project',
      C: 'An SQLite database file',
      D: 'A PDF report of your code architecture',
    },
    answer: 'A',
    explanation: 'Journal Mode focuses on meta-cognitive reflection, where you write about your learning process and optionally share the LLM chat log.',
  },
  {
    id: 12,
    category: 'Platform',
    question: 'Can students view the proctored mock scores of other students?',
    options: {
      A: 'Yes, proctored mock results are a public, auditable record in the system',
      B: 'No, students can only see their own mock scores',
      C: 'Only if they are pair partners',
      D: 'Only during the final week of training',
    },
    answer: 'A',
    explanation: 'To maintain transparency and audit integrity, proctored mock results are visible to all trainees on the platform.',
  },
  {
    id: 13,
    category: 'The Wall',
    question: 'Can practice streak scores directly override mock exam results?',
    options: {
      A: 'No, practice data never replaces proctored mock performance',
      B: 'Yes, if the streak is longer than 10 weeks',
      C: 'Yes, if the captain decides so',
      D: 'Only in pair-based tracks',
    },
    answer: 'A',
    explanation: 'No matter how high your streak or practice score, only proctored scrimmages determine selection. Practice metrics are purely diagnostic.',
  },
  {
    id: 14,
    category: 'Roles',
    question: 'Who can assign or remove a student as a Domain Captain?',
    options: {
      A: 'System Administrator (Admin)',
      B: 'Instructor',
      C: 'Other Domain Captains',
      D: 'The student themselves',
    },
    answer: 'A',
    explanation: 'Only administrators have the permissions to provision users, change roles, and assign or remove Domain Captains.',
  },
  {
    id: 15,
    category: 'Milestones',
    question: 'What happens if a student attempts to submit a milestone offline?',
    options: {
      A: 'The application queues the write in IndexedDB and syncs it when connection is restored',
      B: 'The submission is rejected immediately and lost',
      C: 'The browser crashes',
      D: 'The user is logged out automatically',
    },
    answer: 'A',
    explanation: 'The platform\'s PWA capability includes an offline sync outbox that replays pending submissions once you\'re back online.',
  },
  {
    id: 16,
    category: 'Domains',
    question: 'Which of the following is NOT one of the six IT Olympics domains?',
    options: {
      A: 'Cyber Security & Ethical Hacking',
      B: 'Web Development',
      C: 'Database Systems',
      D: 'Java Programming',
    },
    answer: 'A',
    explanation: 'The six official domains are Java Programming, Web Development, Database Systems, Quiz Bee, Python Scripting, and Computer Networking.',
  },
  {
    id: 17,
    category: 'Platform',
    question: 'How are Weekly Spotlights selected?',
    options: {
      A: 'Instructors manually highlight outstanding trainee write-ups or achievements',
      B: 'The system selects them randomly based on ID',
      C: 'Students vote on their favorite teammates',
      D: 'The domain captain with the highest streak is automatically featured',
    },
    answer: 'A',
    explanation: 'Weekly Spotlights are handpicked by instructors to celebrate great reflections, code quality, or training breakthroughs.',
  },
  {
    id: 18,
    category: 'Streaks',
    question: 'What constitutes \'activity\' to maintain a weekly training streak?',
    options: {
      A: 'Submitting at least one milestone in any mode during the week',
      B: 'Logging in to the application daily',
      C: 'Editing your profile avatar',
      D: 'Sending a message on the Discord server',
    },
    answer: 'A',
    explanation: 'To keep a training streak alive, you must complete and submit at least one milestone during the weekly reset window.',
  },
  {
    id: 19,
    category: 'Roles',
    question: 'What additional view is restricted exclusively to Staff (Admins, Instructors, and Captains)?',
    options: {
      A: 'Leading Candidates',
      B: 'Help & Tutorial',
      C: 'Leaderboard',
      D: 'Proctored Mocks list',
    },
    answer: 'A',
    explanation: 'The Leading Candidates analysis view is staff-only, protecting private diagnostic trends and assisting with delegation selection.',
  },
  {
    id: 20,
    category: 'The Wall',
    question: 'Why is the practice environment isolated from the selection process?',
    options: {
      A: 'To prevent LLM cheating/generation from inflating selection results',
      B: 'To reduce server database size',
      C: 'To allow students to train in private without any logging',
      D: 'Because the IT Olympics rules prohibit computer usage during practice',
    },
    answer: 'A',
    explanation: 'Isolating practice prevents AI generation or external help from inflating selection results. Selection occurs exclusively in proctored, controlled mock exams.',
  },
]

// Shuffles and selects N items
function getRandomQuestions(n: number): Question[] {
  const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

export function TriviaTest() {
  const [questions, setQuestions] = useState<Question[]>(() => getRandomQuestions(10))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)

  const currentQuestion = questions[currentIndex]

  const handleOptionSelect = (optionKey: string) => {
    if (isAnswered) return
    setSelectedOption(optionKey)
  }

  const handleAnswerSubmit = () => {
    if (selectedOption === null || isAnswered) return
    setIsAnswered(true)
    if (selectedOption === currentQuestion.answer) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
      setIsAnswered(false)
    } else {
      setQuizFinished(true)
    }
  }

  const handleReset = () => {
    setQuestions(getRandomQuestions(10))
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setScore(0)
    setQuizFinished(false)
  }

  // Get score feedback
  const getScoreTier = (s: number) => {
    if (s >= 9) return { label: 'System Expert', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
    if (s >= 6) return { label: 'Getting There', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
    return { label: 'Keep Studying!', color: 'bg-destructive/10 text-destructive border-destructive/20' }
  }

  const scoreTier = getScoreTier(score)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="size-5 text-primary" />
          Quick Trivia Test
        </CardTitle>
        <CardDescription>
          Challenge yourself and test your understanding of the RIO system rules, milestones, roles, and selection process.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!quizFinished ? (
          <div className="space-y-4">
            {/* Progress and status */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Question {currentIndex + 1} of {questions.length}</span>
                <span>Category: <span className="font-medium text-foreground">{currentQuestion.category}</span></span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question card */}
            <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm sm:text-base font-semibold leading-snug">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Option Buttons */}
            <div className="grid gap-2.5">
              {Object.entries(currentQuestion.options).map(([key, val]) => {
                const isSelected = selectedOption === key
                const isCorrect = currentQuestion.answer === key

                let btnStyles = 'border-border bg-card text-left hover:border-muted-foreground/30 hover:bg-muted/10'

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyles = 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                  } else if (isSelected) {
                    btnStyles = 'border-destructive bg-destructive/5 text-destructive ring-1 ring-destructive/20'
                  } else {
                    btnStyles = 'border-border bg-muted/20 opacity-60'
                  }
                } else if (isSelected) {
                  btnStyles = 'border-primary bg-primary/5 ring-2 ring-primary/20 font-semibold'
                }

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleOptionSelect(key)}
                    className={cn(
                      'w-full flex items-center justify-between p-3.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20',
                      btnStyles
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn(
                        'size-5.5 rounded-md flex items-center justify-center text-xs border font-bold shrink-0',
                        isSelected ? 'bg-primary text-white border-primary' : 'bg-muted/40 text-muted-foreground'
                      )}>
                        {key}
                      </span>
                      <span>{val}</span>
                    </span>
                    {isAnswered && isCorrect && <Check className="size-4 text-emerald-500 shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <X className="size-4 text-destructive shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Action panel & Feedback */}
            <div className="space-y-4 pt-2">
              {isAnswered && (
                <div className={cn(
                  'rounded-xl p-4 border text-xs leading-relaxed animate-in slide-in-from-top-1 duration-200',
                  selectedOption === currentQuestion.answer
                    ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-destructive/5 border-destructive/10 text-destructive'
                )}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {selectedOption === currentQuestion.answer ? (
                      <>
                        <Check className="size-4 text-emerald-500" />
                        <span>Correct!</span>
                      </>
                    ) : (
                      <>
                        <X className="size-4 text-destructive" />
                        <span>Incorrect. The correct answer is {currentQuestion.answer}.</span>
                      </>
                    )}
                  </div>
                  <p className="text-muted-foreground">{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="flex justify-end">
                {!isAnswered ? (
                  <Button
                    disabled={selectedOption === null}
                    onClick={handleAnswerSubmit}
                    className="w-full sm:w-auto"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="w-full sm:w-auto flex items-center gap-1.5">
                    {currentIndex < questions.length - 1 ? (
                      <>
                        Next Question
                        <ArrowRight className="size-4" />
                      </>
                    ) : (
                      <>
                        View Results
                        <Award className="size-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Quiz Results screen */
          <div className="text-center py-6 space-y-6 max-w-md mx-auto animate-in zoom-in-95 duration-300">
            <div className="size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <Award className="size-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Trivia Quiz Finished!</h3>
              <p className="text-sm text-muted-foreground">
                You scored <span className="font-bold text-foreground">{score}</span> out of <span className="font-bold text-foreground">{questions.length}</span>.
              </p>
              <div className="pt-2">
                <Badge variant="outline" className={cn('text-xs font-semibold px-2.5 py-1 uppercase tracking-wider', scoreTier.color)}>
                  {scoreTier.label}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Use this test to review the mechanics. Streaks and mocks ensure Tagudin selects the strongest, most consistent delegation. You can retake the quiz anytime to see a new set of questions!
            </p>

            <Button onClick={handleReset} className="w-full flex items-center justify-center gap-1.5">
              <RotateCcw className="size-4" />
              Retake Quiz (Reshuffles questions)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
