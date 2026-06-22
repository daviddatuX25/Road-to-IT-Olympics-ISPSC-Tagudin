# Strategic Competition Curriculum Map
## IT Skills Olympics — Full Season, Week 1–14
### All Six Domains · Competition-Grounded · Milestone-Ready

> **Philosophy:** Every milestone exists to close the gap between where students are and what wins the actual contest.
> The quiz bee is won on **breadth**. Java/Python are won on **algorithmic speed + correctness under pressure**.
> DB is won on **SQL recall speed + normalization fluency**. Web is won on **layout precision in under 2 hours**.
> Networking is won on **VLSM arithmetic + IOS CLI muscle memory**.

---

## Phase Timeline

| Phase | Weeks | Key Focus |
|:---|:---|:---|
| **Orientation** | Week 1 | Diagnostic — establish baselines across all domains |
| **Foundation** | Weeks 2–4 | Core concepts, fundamentals, first assessments |
| **Maintenance** | Weeks 5–8 | Spaced repetition, harder variations, pair drills |
| **Sprint** | Weeks 9–12 | Full mock contests, time pressure, contest simulation |
| **Taper** | Weeks 13–14 | Readiness, composure, miss-log reviews |

**Phase-to-weekOrPhase key mapping:**
- Week 1 → `july-diagnostic`
- Weeks 2–4 → `aug-w1`, `aug-w2`, `aug-w3`, `aug-w4`
- Weeks 5–8 → `sep-w1`, `sep-w2`, `sep-w3`, `sep-w4`
- Weeks 9–12 → `oct-sprint`
- Weeks 13–14 → `nov-final`

---

## Domain 1: Java Programming (`java`)
> **Contest format:** 6 problems (2 Easy / 2 Average / 2 Difficult) · 2 hours · Notepad + `javac`/`java` CLI only · Pair-based
>
> **What wins:** Fast, clean algorithmic code without an IDE. The hard problems are Difficult DSA — sorting variants, greedy, sliding window, prefix sums, graph basics. OOP is just scaffolding for the algorithm problems. Train like LeetCode-under-notepad.

### Week 1 — `july-diagnostic` · Tutor (Easy) · "Java Baseline Check"
**Topic:** Variables, data types, I/O (`Scanner`), basic loops and conditionals
**Strategic rationale:** Establishes which students can type syntactically correct Java from memory. Without this baseline, pairing decisions are blind guesses.
**Template:** `AI Instructor — Adaptive Explorer`
**Prompt focus:** Ask the student to write a program that reads N integers and prints the maximum. Diagnose if they struggle with Scanner boilerplate, off-by-one loops, or basic comparisons.

---

### Week 2 — `aug-w1` · Tutor (Easy) · "Arrays + Strings Without a Net"
**Topic:** 1D arrays, manual array traversal, String `.charAt()`, `.length()`, `.substring()`, `.indexOf()` — no `StringBuilder.reverse()`
**Strategic rationale:** Arrays and strings are the substrate for 4 of 6 contest problems. Students must be able to manipulate them by hand without IDE autocomplete.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Reverse an array in-place (no extra copy)
- Count occurrences of a character in a string manually
- Find the second largest element in an array

---

### Week 3 — `aug-w2` · Tutor (Average) · "Searching & Sorting — Fundamentals"
**Topic:** Linear search, binary search, Bubble sort, Selection sort, Insertion sort — written by hand, not via `Arrays.sort()`
**Strategic rationale:** Binary search and manual sorts appear in Easy-Average tier problems. The proctor expects the student to write sorting logic; calling `Collections.sort()` on a custom object without knowing how to implement it manually is a trap.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Implement binary search on a sorted array
- Implement selection sort; explain the swap logic
- Given an array, find the position of the 3rd smallest element

---

### Week 4 — `aug-w3` · Assessment (Average) · "Self-Assessment: Searching & Sorting"
**Topic:** Mixed sorting and searching problems under timed conditions (30 minutes)
**Strategic rationale:** First scored assessment. Locks in the baseline score for the August scrimmage gate.
**Template:** `Assessment Mode Rubric`
**Challenges:**
1. Given an array of N integers (N ≤ 1000), sort them in descending order **without** using `Arrays.sort()`. Print the sorted array.
2. Given a sorted array and a target integer T, return the index using binary search. Return -1 if not found.

**Rubric:** Correctness (4 pts × 2), Efficiency (2 pts × 2), Code Clarity (2 pts × 2), Edge Cases (2 pts × 2) = **20 pts total**

---

### Week 5 — `sep-w1` · Tutor (Average) · "Two Pointers & Sliding Window"
**Topic:** Two-pointer technique (pair sum, palindrome check), fixed/variable sliding window (max subarray sum of size K, longest substring without repeating chars)
**Strategic rationale:** Sliding window problems appear heavily in Average and Difficult tiers. They reduce O(N²) brute force to O(N) and are the most common "clever trick" the contest tests.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Find the maximum sum subarray of size K using a sliding window
- Check if a string is a palindrome using two pointers
- Find the smallest subarray with sum ≥ S

---

### Week 6 — `sep-w2` · Tutor (Average) · "Prefix Sums & Frequency Arrays"
**Topic:** Prefix sum array construction, range sum queries, frequency counting with plain integer arrays
**Strategic rationale:** Range sum queries and frequency counting solve a large class of contest problems in O(1) after O(N) preprocessing. Students who don't know prefix sums write nested loops and time out.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Build a prefix sum array, answer K range sum queries in O(1)
- Count elements in a range [L, R] using a frequency array
- Given a string, count the number of substrings where vowels appear exactly K times

---

### Week 7 — `sep-w3` · Tutor (Difficult) · "Recursion & Backtracking"
**Topic:** Recursive thinking (factorial, Fibonacci memoized), subset enumeration, basic backtracking (N-Queens lite, permutations of a string)
**Strategic rationale:** Difficult-tier Java problems often require backtracking or recursive decomposition. Students who freeze at recursion lose both Difficult problems every contest.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Generate all permutations of a string of length ≤ 8
- Print all subsets of an array of N integers
- Solve the 0/1 knapsack problem with recursion + memoization (N ≤ 20)

---

### Week 8 — `sep-w4` · Assessment (Difficult) · "Algorithmic Pressure Test"
**Topic:** Mixed DSA — sliding window + prefix sums + recursion (45 minutes)
**Strategic rationale:** The second scored assessment before October sprint. Validates whether September's maintenance milestones landed.
**Template:** `AI Proctor — Practical Coding Assessment`
**Challenges:**
1. Given a string S of lowercase letters, find the length of the longest substring without repeating characters. (O(N) expected)
2. Given an array A of N integers, count the number of subarrays where the sum equals exactly K.

---

### Week 9 — `oct-sprint` · Tutor (Difficult) · "Greedy Algorithms"
**Topic:** Greedy paradigm — activity selection, interval scheduling, fractional knapsack logic, coin change (greedy when denomination structure allows)
**Strategic rationale:** Greedy problems look deceptively simple but require the student to articulate why greedy works. Partial credit is often lost when the student picks the wrong greedy criterion.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Activity selection: given N intervals, find the maximum number of non-overlapping activities
- Coin change with canonical denominations (greedy)
- Given N jobs with deadlines and profits, schedule to maximize profit

---

### Week 10 — `oct-sprint` · Tutor (Difficult) · "Graph Basics: BFS & DFS"
**Topic:** Adjacency list construction (via arrays of `ArrayList`), BFS (level traversal, shortest path in unweighted graph), DFS (reachability, connected components)
**Strategic rationale:** Graph problems appear in Difficult tier, and ICPC-style contests (which the IT Olympics format mirrors) invariably include at least one graph problem. Students who cannot write BFS/DFS concede both Difficult problems.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Build a graph from edge input, run BFS from source S, print shortest distances to all nodes
- Count connected components using DFS
- Determine if a graph is bipartite using BFS coloring

---

### Week 11 — `oct-sprint` · Assessment (Pair Drill) · "Mock 1 — Full Set (2 hrs)"
**Topic:** 6 problems — 2 Easy (arrays/strings), 2 Average (sliding window / prefix sums), 2 Difficult (greedy / graph)
**Strategic rationale:** First full-dress 2-hour pair mock under Notepad+CLI contest constraints. Role split enforced: Partner A owns Easy + 1 Average; Partner B owns 1 Average + Difficult pair.
**Template:** `AI Proctor — Practical Coding Assessment`
**Rules:** No IDE, no internet, Notepad only. Captain proctors in person. Score feeds eligibility gate.

---

### Week 12 — `oct-sprint` · Assessment (Difficult) · "Named Algorithm Drill"
**Topic:** Named algorithms — Kadane's Algorithm (max subarray), Floyd's Cycle Detection, Sieve of Eratosthenes, KMP string search
**Strategic rationale:** These named algorithms appear by name in contest problem statements. Students who have only ever solved problems intuitively often miss the optimization or write quadratic implementations where linear is expected.
**Template:** `Assessment Mode Rubric`
**Challenges:**
1. Implement Kadane's Algorithm. Extend it to return the actual subarray, not just the sum.
2. Implement the Sieve of Eratosthenes to find all primes ≤ N (N ≤ 1,000,000) and answer Q queries: is X prime?

---

### Week 13 — `nov-final` · Drill (Easy) · "Miss-Log Repair"
**Topic:** Student re-solves 3 problems from their own Mock 1/2 weak-spot log — untimed, to rebuild confidence and patch specific gaps
**Template:** `AI Instructor — Friendly & Warm`

---

### Week 14 — `nov-final` · Journal · "Contest-Day Checklist"
**Topic:** `javac` / `java` compilation muscle memory, common runtime errors (ArrayIndexOutOfBoundsException, NullPointerException, StackOverflow), pair role script (who reads first, who codes first), 5-minute problem triage routine
**Template:** `Journal Reflection Template`

---
---

## Domain 2: Database Management (`db`)
> **Contest format:** Individual · mysql CLI via XAMPP · Screenshots pasted into Word · Fastest correct submission wins
>
> **What wins:** Typing correct SQL without hesitation, knowing normalization theory cold, and running complex JOINs and subqueries from memory. Speed = score. Every second saved on syntax recall is a second available for harder problems.

### Week 1 — `july-diagnostic` · Tutor (Easy) · "SQL Baseline"
**Topic:** `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`, `DISTINCT` — basic querying from a single table
**Template:** `AI Instructor — Adaptive Explorer`
**Prompt focus:** Read 5 rows from a `students` table. Filter by condition. Order by GPA descending. Diagnose typing speed and syntax recall.

---

### Week 2 — `aug-w1` · Tutor (Easy) · "Multi-Table JOINs"
**Topic:** `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN` — across 2 and 3 tables with proper aliases
**Strategic rationale:** The majority of DB contest problems involve 2–4 table JOINs. Students who cannot alias tables and filter JOIN results cleanly will lose points on nearly every hard problem.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- JOIN `students` and `enrollments` to list all enrolled students and their courses
- LEFT JOIN to find students with no enrollment
- 3-table JOIN: students → enrollments → courses

---

### Week 3 — `aug-w2` · Tutor (Average) · "Aggregate Functions & GROUP BY"
**Topic:** `COUNT()`, `SUM()`, `AVG()`, `MAX()`, `MIN()`, `GROUP BY`, `HAVING` — filtered aggregates
**Strategic rationale:** Aggregate + HAVING is the second most tested SQL pattern. The HAVING clause (not WHERE) is the one students consistently confuse.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Count students per department
- Find departments with more than 10 enrolled students (HAVING)
- Average GPA per year level — filter to show only year levels with avg GPA > 2.5

---

### Week 4 — `aug-w3` · Assessment (Average) · "JOIN + Aggregate Assessment"
**Topic:** Mixed JOIN + GROUP BY + HAVING under timed conditions (20 minutes)
**Template:** `Assessment Mode Rubric`
**Challenges:**
1. List each department name and the number of students enrolled in it. Sort descending.
2. Find all courses where the average grade of enrolled students is below 75. Include only courses with at least 5 enrolled students.

---

### Week 5 — `sep-w1` · Tutor (Average) · "Subqueries — Scalar & Correlated"
**Topic:** Scalar subqueries in SELECT/WHERE, correlated subqueries, `IN` / `NOT IN` / `EXISTS` / `NOT EXISTS`
**Strategic rationale:** Subqueries are the "Difficult tier" entry point in DB contests. Correlated subqueries (where the inner query references the outer) are the hardest and most tested variation.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Find students whose GPA is above the average GPA of their own department (correlated)
- Find courses that have no enrollments (`NOT EXISTS`)
- For each student, find the highest grade they have ever received (scalar in SELECT)

---

### Week 6 — `sep-w2` · Tutor (Average) · "Normalization Theory — 1NF through BCNF"
**Topic:** First Normal Form (atomic values, no repeating groups), Second Normal Form (full functional dependency), Third Normal Form (transitive dependency elimination), Boyce-Codd Normal Form — with decomposition practice
**Strategic rationale:** Normalization is tested theoretically (identify which NF a relation violates, decompose it) in the Quiz Bee AND in DB contests as schema design tasks. Drilling theory here pays dividends in two domains.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Given a relation, identify if it is in 1NF / 2NF / 3NF. If not, decompose it.
- Identify partial and transitive functional dependencies by hand
- Practice decomposing a violating relation into smaller 3NF tables with correct foreign keys

---

### Week 7 — `sep-w3` · Tutor (Difficult) · "DML: INSERT, UPDATE, DELETE + Transactions"
**Topic:** Multi-row `INSERT`, `UPDATE ... WHERE` with subquery conditions, `DELETE`, `INSERT ... SELECT` (archive pattern), `START TRANSACTION` / `COMMIT` / `ROLLBACK`
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Multi-row INSERT into `enrollments`
- UPDATE course capacity using a correlated subquery that counts existing enrollments
- Archive dropped enrollments into a `dropped_history` table using `INSERT ... SELECT`, then DELETE originals; wrap in a transaction

---

### Week 8 — `sep-w4` · Assessment (Difficult) · "Full DML + Normalization Assessment"
**Topic:** Mixed DML + subquery + transaction (30 minutes)
**Template:** `Assessment Mode Rubric`
**Challenges:**
1. A `orders` table has a `product_list` column containing comma-separated product IDs (un-normalized). Write the SQL to identify which orders violate 1NF. State how you would normalize the schema.
2. Write a transaction that: (a) inserts a new enrollment, (b) updates the `seats_remaining` on the course, (c) rolls back if `seats_remaining` would go below 0.

---

### Week 9 — `oct-sprint` · Tutor (Difficult) · "Advanced SQL: Window Functions & CTEs"
**Topic:** `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `LEAD()`, `LAG()`, Common Table Expressions (`WITH`), recursive CTE basics
**Strategic rationale:** Window functions are high-value advanced SQL that appear in Difficult-tier DB contest problems. Students who know CTEs can write cleaner, faster solutions under pressure.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Rank students within each department by GPA using `DENSE_RANK()`
- Using `LAG()`, find students whose GPA improved from their previous semester
- Rewrite a complex nested subquery as a CTE

---

### Week 10 — `oct-sprint` · Assessment (Speed Round) · "10-Query Speed Drill"
**Topic:** Rapid-fire DQL + DML + subquery, one query per ~90 seconds, screenshotted after each
**Template:** `Assessment Mode Rubric`
**Challenges (10 escalating):** SELECT/WHERE · JOIN · Aggregate · HAVING · Subquery · Correlated subquery · INSERT with SELECT · UPDATE with subquery · ROLLBACK transaction · Window function

---

### Week 11 — `oct-sprint` · Assessment (Full Mock) · "DB Mock Contest (60–90 min)"
**Topic:** Full mock under exact contest conditions: mysql CLI only, no phpMyAdmin, 10–12 escalating problems, screenshot → Word → PDF
**Template:** `AI Proctor — Practical Coding Assessment`

---

### Week 12 — `oct-sprint` · Drill (Difficult) · "Recovery Under Pressure"
**Topic:** Intentionally broken multi-table JOIN+subquery (wrong alias, missing ON clause, ambiguous column name) — student diagnoses and fixes using only CLI error messages
**Template:** `AI Instructor — Strict & Critical`

---

### Week 13 — `nov-final` · Drill (Easy) · "Flash Queries — Full Coverage"
**Topic:** 8 recall queries — one per major SQL category (SELECT, JOIN, GROUP BY, HAVING, subquery, INSERT, UPDATE, transaction) — pure muscle memory typing
**Template:** `AI Instructor — Friendly & Warm`

---

### Week 14 — `nov-final` · Journal · "Contest-Day Checklist"
**Topic:** XAMPP startup sequence (`httpd` + `mysql`), common CLI mistakes (missing semicolons, `USE db_name`, `DESCRIBE table`), Word screenshot workflow, "stuck for 2 minutes" decision rule
**Template:** `Journal Reflection Template`

---
---

## Domain 3: Web Design (`web`)
> **Contest format:** Individual · Single themed HTML/CSS page · 2 hours · Notepad++ only · No JavaScript · Assets provided day-of
>
> **What wins:** Fast, clean semantic HTML structure + precise CSS without relying on JS or frameworks. Layout speed matters more than pixel-perfect design. Judges score on layout completeness, responsive structure, semantic HTML usage, and visual fidelity to the brief.

### Week 1 — `july-diagnostic` · Tutor (Easy) · "HTML5 Semantics Baseline"
**Topic:** Semantic tags (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`), document structure, `<meta>` viewport tag
**Template:** `AI Instructor — Adaptive Explorer`
**Prompt focus:** Build a skeleton for a school homepage using only semantic tags. No styling yet. Diagnose if the student understands structural hierarchy vs. presentation.

---

### Week 2 — `aug-w1` · Tutor (Easy) · "CSS Box Model & Typography"
**Topic:** `margin`, `padding`, `border`, `box-sizing: border-box`, `font-family`, `font-size`, `line-height`, `color`, CSS reset/normalize habits
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Recreate a card component using box model properties only (no Flexbox yet)
- Apply a Google-style clean typography system (`font-family`, sizes, line-height)
- Explain when you use `margin: auto` vs. `text-align: center`

---

### Week 3 — `aug-w2` · Tutor (Average) · "Flexbox Layouts"
**Topic:** `display: flex`, `flex-direction`, `justify-content`, `align-items`, `flex-wrap`, `flex-grow`/`flex-shrink`, centering patterns
**Strategic rationale:** Flexbox solves ~70% of layout challenges in web contests. A student who can write Flexbox from memory handles nav bars, card grids, and hero sections without guessing.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Build a responsive nav bar with logo left, links right using only Flexbox
- Create a 3-column feature card row that wraps on smaller screens
- Perfectly center content both horizontally and vertically inside a section

---

### Week 4 — `aug-w3` · Assessment (Average) · "Themed Sprint: Portfolio Page (45 min)"
**Topic:** Full single-page layout: nav, hero, 3-column grid, footer — Flexbox/Grid, semantic HTML, basic CSS
**Template:** `Assessment Mode Rubric`
**Challenge:** Build a personal portfolio page with: (1) sticky nav with links, (2) hero with name/title/CTA button, (3) skills grid with 3 cards, (4) footer with social icons.

---

### Week 5 — `sep-w1` · Tutor (Average) · "CSS Grid Layouts"
**Topic:** `display: grid`, `grid-template-columns`, `grid-template-rows`, `gap`, `grid-column`/`grid-row` spans, `auto-fill`/`auto-fit` with `minmax()`
**Strategic rationale:** CSS Grid handles 2D layouts that Flexbox struggles with — photo galleries, pricing tables, complex magazine-style sections. Both appear regularly in web design contest briefs.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Build a 4-column image gallery that collapses to 2 columns on smaller viewports
- Create a pricing table with 3 tiers using Grid
- Implement a responsive dashboard layout with sidebar using `grid-template-areas`

---

### Week 6 — `sep-w2` · Tutor (Average) · "CSS Transitions, Transforms & Pseudo-classes"
**Topic:** `transition`, `transform: scale/rotate/translateY`, `:hover`, `:focus`, `:active`, `:nth-child()`, CSS custom properties (`--var`)
**Template:** `AI Instructor — Friendly & Warm`
**Prompt focus:**
- Button with hover-lift effect (`transform: translateY(-3px)` + `box-shadow` transition)
- Image card with scale-on-hover zoom
- Smooth color fade on nav links using `transition: color 0.2s`

---

### Week 7 — `sep-w3` · Tutor (Difficult) · "CSS-Only Interactive Components"
**Topic:** CSS-only dropdown nav (`:hover` + nested `<ul>`), CSS-only hamburger toggle (checkbox hack: `<input type="checkbox">` + `<label>` + `~` sibling selector), `<details>`/`<summary>` accordion
**Strategic rationale:** The contest bans JavaScript entirely. Students who don't know the checkbox hack cannot implement mobile toggles, which are consistently required in contest briefs.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Build a horizontal nav with a hover-reveal dropdown for a "Services" category
- CSS-only hamburger menu that reveals a vertical nav on toggle
- CSS accordion FAQ using `<details>`/`<summary>`

---

### Week 8 — `sep-w4` · Assessment (Difficult) · "Themed Sprint: Bookstore Landing (60 min)"
**Topic:** Hero section, CSS Grid product cards, CSS-only dropdown nav, footer with columns
**Template:** `AI Proctor — Practical Coding Assessment`
**Challenge:** Unseen brief revealed at start: Build a bookstore landing page with sticky nav (CSS-only dropdown), hero with tagline + CTA, 4-column book card grid using CSS Grid, and a 3-column footer.

---

### Week 9 — `oct-sprint` · Tutor (Difficult) · "Responsive Design & Media Queries"
**Topic:** `@media` breakpoints, mobile-first approach, viewport meta, fluid images (`max-width: 100%`), responsive typography using `clamp()`
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Convert the Week 8 page to fully responsive (mobile → tablet → desktop)
- Use `@media (max-width: 768px)` to collapse 4-column grids to 1-column stacks
- Apply `clamp()` for fluid headings that scale between min and max sizes

---

### Week 10 — `oct-sprint` · Assessment (Full Sprint) · "Mock 1 — Unseen Brief (2 hrs)"
**Topic:** Full build from unseen wireframe + asset folder. Theme revealed at start. Single HTML file, embedded CSS, zero JS.
**Template:** `AI Proctor — Practical Coding Assessment`

---

### Week 11 — `oct-sprint` · Assessment (Difficult) · "Mock 2 — Travel Agency Theme (2 hrs)"
**Topic:** Image gallery grid (CSS Grid auto-fill), pricing table (3-column Grid), CSS-only accordion FAQ, hero with background image overlay
**Template:** `AI Proctor — Practical Coding Assessment`

---

### Week 12 — `oct-sprint` · Drill (Speed) · "Component Speed Round (10 min/component)"
**Topic:** 5 isolated components rebuilt under strict 10-minute caps each — nav, hero, card grid, pricing table, footer. No full-page planning; pure recall speed.
**Template:** `AI Instructor — Strict & Critical`

---

### Week 13 — `nov-final` · Drill (Easy) · "Personal Boilerplate Compilation"
**Topic:** Each student assembles their fastest, most reliable CSS patterns — nav boilerplate, grid boilerplate, reset, color variables — for mental rehearsal
**Template:** `AI Instructor — Friendly & Warm`

---

### Week 14 — `nov-final` · Journal · "Contest-Day Readiness"
**Topic:** Notepad++ setup (syntax highlighting ON, auto-indent ON), save-early-save-often discipline, "first 10 minutes" plan: read brief fully → sketch structure on paper → build HTML skeleton → layer CSS top-down
**Template:** `Journal Reflection Template`

---
---

## Domain 4: IT Quiz Bee (`quiz`)
> **Contest format:** Pair-based · Elimination round (30 rapid questions, hard time cap) → ~15 schools advance → Tiered Final (Easy / Intermediate / Difficult rounds with buzzer)
>
> **What wins:** BREADTH of recall wins the elimination round. Depth in specific weak spots wins the tiered final. The bottleneck is the elimination — a school that can't clear it loses no matter how deep their Difficult-tier knowledge goes.
>
> **Topic coverage required:** Computer History · Hardware · Data Structures & Algorithms (theory) · OS concepts · Networking (OSI, TCP/IP, subnetting) · Databases (SQL + normalization theory) · Cybersecurity · Programming Languages · Software Engineering · Web Technologies · Emerging Tech (AI/ML, Cloud, IoT) · Number systems & Boolean algebra

### Week 1 — `july-diagnostic` · Tutor (Easy) · "Full-Breadth Diagnostic Sweep"
**Topic:** 30-question sweep across all 10 topic categories — identifies which topics are cold for each pair
**Template:** `AI Instructor — Adaptive Explorer`
**Prompt focus:** Rapid-fire questions across hardware, networking, OS, DB, cybersecurity, software engineering. The AI scores per category and recommends which weeks to prioritize.

---

### Week 2 — `aug-w1` · Tutor (Easy) · "Computer History & Computing Pioneers"
**Topic:** Generations of computers (vacuum tubes → transistors → ICs → microprocessors → AI era), key inventors: Alan Turing, Ada Lovelace, John von Neumann, Grace Hopper, Tim Berners-Lee; famous firsts: ENIAC, first bug (Grace Hopper), first programming language, ARPANET, invention of WWW (1989, CERN), first computer virus (Creeper, 1971)
**Strategic rationale:** Computer history questions appear in nearly every elimination round. They're fast, pure-recall, and cost zero time for a prepared pair.
**Template:** `AI Instructor — Tagalog & Taglish`
**Prompt focus:** Flashcard-style rapid fire on inventors, years, and famous firsts. Pair must answer as a unit — who speaks first is a strategy decision.

---

### Week 3 — `aug-w2` · Tutor (Average) · "Number Systems & Boolean Algebra"
**Topic:** Binary ↔ Decimal ↔ Hexadecimal ↔ Octal conversions, 1s and 2s complement (negative numbers), binary arithmetic (addition, subtraction), Boolean algebra laws (De Morgan's, distributive, absorption), truth tables, logic gate symbols (AND, OR, NOT, NAND, NOR, XOR, XNOR)
**Strategic rationale:** Number system conversions are almost always in the elimination round. 2s complement and Boolean simplification appear in Intermediate/Difficult tiers. A pair that can convert 10-bit numbers in 15 seconds has a significant time advantage.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Convert 10110101₂ to decimal, hex, and octal
- Represent -47 in 8-bit 2s complement
- Simplify: A·(A+B) = ? and prove using Boolean laws

---

### Week 4 — `aug-w3` · Assessment (Average) · "History + Number Systems Speed Quiz (15 questions)"
**Topic:** Mixed computer history, number conversions, Boolean basics
**Template:** `Assessment Mode Rubric`
**Format:** 15 questions, 20-second time guidance per question. Scored pass/fail per question against a cut line.

---

### Week 5 — `sep-w1` · Tutor (Average) · "Operating System Concepts"
**Topic:** OS roles and types (batch, time-sharing, real-time, distributed), process states (new, ready, running, waiting, terminated), CPU scheduling algorithms (FCFS, SJF, Round Robin, Priority), memory management (paging, segmentation, virtual memory, page replacement — FIFO, LRU, Optimal), deadlock (Coffman conditions: mutual exclusion, hold-and-wait, no preemption, circular wait), disk scheduling (FCFS, SSTF, SCAN/LOOK)
**Strategic rationale:** OS is the single most tested theoretical topic in Difficult-tier quiz bee rounds. Scheduling algorithms and deadlock conditions appear regularly.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Given a process table, compute average waiting time using Round Robin (quantum = 2)
- Identify which Coffman condition is violated if condition X is removed
- Explain the difference between paging and segmentation in one sentence each

---

### Week 6 — `sep-w2` · Tutor (Average) · "Data Structures Theory"
**Topic:** Arrays, linked lists (singly, doubly, circular), stacks (LIFO, applications: expression evaluation, balanced parentheses), queues (FIFO, circular queue, priority queue, deque), trees (binary tree, BST, AVL tree — balancing concept), heaps (min-heap, max-heap, heap sort), hash tables (collision: chaining vs. open addressing)
**Strategic rationale:** DSA theory (not implementation — that's Java's domain) appears heavily in Quiz Bee. "What data structure is best for X?" questions appear in every tier.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Given a string, determine if parentheses are balanced — which data structure and why?
- What is the time complexity of BST search in best, average, and worst case?
- A min-heap has elements [3, 5, 9, 1, 7]. Draw the heap after inserting 2.

---

### Week 7 — `sep-w3` · Tutor (Average) · "Networking Breadth — OSI + TCP/IP + Protocols"
**Topic:** OSI 7-layer model (each layer's name, function, example protocol), TCP/IP model (4 layers, mapping to OSI), key protocols (HTTP/HTTPS, FTP, SMTP/POP3/IMAP, DNS, DHCP, ARP, ICMP, TCP vs. UDP differences), IP addressing (Class A/B/C ranges, public vs. private), MAC address format
**Strategic rationale:** Networking questions span OSI layer identification, protocol-to-layer mapping, and TCP vs. UDP tradeoffs. These appear in both elimination and tiered final rounds.
**Template:** `AI Instructor — Tagalog & Taglish`
**Prompt focus:**
- At which OSI layer does a switch operate? A router? A hub?
- What protocol resolves IP → MAC? What protocol assigns IP addresses dynamically?
- TCP vs. UDP — give one application where each is preferred and why

---

### Week 8 — `sep-w4` · Assessment (Difficult) · "Sudden-Death Stage Simulation"
**Topic:** 10 questions across OS + DSA theory + Networking — hard 10-second answer window per question
**Template:** `Assessment Mode Rubric`
**Format:** Replicates the stage tiebreaker pressure. Pair must answer verbally (simulate by typing) within 10 seconds. Incorrect answer = 0, no partial credit.

---

### Week 9 — `oct-sprint` · Tutor (Average) · "Cybersecurity — Attack Types, Encryption, Protocols"
**Topic:** Common attacks (phishing, DoS/DDoS, man-in-the-middle, SQL injection, XSS, ransomware, social engineering, brute force), symmetric encryption (AES, DES, 3DES) vs. asymmetric (RSA, ECC), hashing (MD5, SHA-1, SHA-256 — not for passwords), PKI basics (certificates, CA, digital signatures), firewalls (stateful vs. stateless), IDS vs. IPS, VPN, HTTPS (TLS handshake conceptually)
**Strategic rationale:** Cybersecurity is one of the fastest-growing topic areas in IT quiz bee events. Expect at least 3–5 elimination questions and 1–2 Difficult-tier questions to come from here.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- What type of attack intercepts communication between two parties?
- AES-256 is symmetric or asymmetric? What key does the receiver use to decrypt in RSA?
- Explain TLS in 3 sentences. What does the handshake establish?

---

### Week 10 — `oct-sprint` · Tutor (Difficult) · "Software Engineering + Emerging Tech"
**Topic:** SDLC models (Waterfall, Agile/Scrum, Spiral, V-Model — differences and when to use), UML diagrams (use case, class, sequence, activity), software testing types (unit, integration, system, UAT, regression), version control concepts (Git: commit, branch, merge, rebase, conflict), Cloud computing (IaaS/PaaS/SaaS with examples), AI/ML basics (supervised vs. unsupervised, classification vs. regression, neural network concept), IoT definition and components
**Strategic rationale:** Software engineering questions appear in Intermediate tier. Emerging tech (AI/Cloud) increasingly appears in Difficult tier as organizers modernize question sets.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Explain the difference between Agile and Waterfall in one sentence. When would you choose each?
- What is the difference between IaaS and PaaS? Give a real-world product example of each.
- What is overfitting in machine learning? How do you detect it?

---

### Week 11 — `oct-sprint` · Assessment (Elimination Simulation) · "Survival Gate"
**Topic:** 30 questions across all 10 topic areas — hard per-question time cap, scored pass/fail against a cut line
**Template:** `Assessment Mode Rubric`
**Format:** Mirrors exact elimination round mechanics. Pair submits one answer per question. Score determines if they would have advanced.

---

### Week 12 — `oct-sprint` · Assessment (Tiered Final Simulation) · "Full Stage Mock"
**Topic:** Easy round (fast recall), Intermediate round (light calculation — subnet math, binary conversion), Difficult round (multi-step: given symptom, identify OSI layer; scheduling algorithm calculation; deadlock scenario)
**Template:** `Assessment Mode Rubric`

---

### Week 13 — `nov-final` · Drill (Easy) · "Weak-Spot Targeted Flash Rounds"
**Topic:** Each pair drills 10 questions targeted at their own personal miss-log from Mocks 1 & 2
**Template:** `Tutor Mode Template`

---

### Week 14 — `nov-final` · Journal · "Calm Under Pressure"
**Topic:** Buzzer/hand-raise etiquette, silent pair-signal system for "who answers," pass vs. guess strategy, calm-reset routine after an incorrect answer, full topic coverage final mental checklist
**Template:** `Journal Reflection Template`

---
---

## Domain 5: Python Programming (`python`)
> **Contest format:** Individual · Pending official mechanics (currently format-agnostic) · CLI execution `python3 file.py` · Treat as ICPC-style algorithmic contests until confirmed otherwise
>
> **What wins:** Same as Java — algorithmic speed and correctness, but leveraging Python's standard library power (`collections`, `itertools`, `heapq`, `re`, `functools`) to write shorter, faster solutions. The danger is Python students over-relying on library magic without understanding the algorithm underneath.

### Week 1 — `july-diagnostic` · Tutor (Easy) · "Python Baseline"
**Topic:** Variables, data types, `input()`/`print()`, f-strings, `range()`, for/while loops, list comprehensions, basic functions
**Template:** `AI Instructor — Adaptive Explorer`
**Prompt focus:** Read N integers, compute and print their sum and average. Diagnose Pythonic thinking vs. Java-style loops.

---

### Week 2 — `aug-w1` · Tutor (Easy) · "Lists, Tuples, Dicts, Sets"
**Topic:** List operations (`append`, `pop`, slicing, `sorted()`), tuples (immutability, unpacking), dictionaries (`get()`, `.items()`, `.keys()`), sets (`union`, `intersection`, `difference`), list comprehensions and dict comprehensions
**Strategic rationale:** Python's built-in collections solve problems in 2–3 lines that would take 15 lines in Java. Students must know which collection to reach for and why.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Given a list of words, count the frequency of each using a dict (then compare with `Counter`)
- Find the intersection of two lists using set operations vs. nested loops — benchmark the difference conceptually
- Use list comprehension to filter and transform in a single expression

---

### Week 3 — `aug-w2` · Tutor (Average) · "Sorting, Searching & Built-ins"
**Topic:** `sorted()` with `key=`, `lambda`, `min()`/`max()` with `key=`, binary search via `bisect` module, `enumerate()`, `zip()`, `map()`, `filter()`
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Sort a list of (name, score) tuples: primary key score descending, secondary key name alphabetically
- Use `bisect.bisect_left` to insert into a sorted list without re-sorting
- Given two lists, produce a dict mapping each pair using `zip()`

---

### Week 4 — `aug-w3` · Assessment (Average) · "Data Structure Fluency Check (25 min)"
**Template:** `Assessment Mode Rubric`
**Challenges:**
1. Given a string, determine if it is an anagram of another string. Use `Counter`. Also write the O(N log N) sorted-comparison version and explain the trade-off.
2. Given a list of integers, find all pairs that sum to a target T. Return as a set of tuples. Solve in O(N) using a set.

---

### Week 5 — `sep-w1` · Tutor (Average) · "Two Pointers & Sliding Window (Python)"
**Topic:** Same paradigm as Java — translated to Python: sliding window with `deque` for O(1) pops, two-pointer palindrome/pair-sum patterns
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Maximum sum subarray of size K (sliding window without `deque`, then with)
- Longest substring without repeating characters (set-based sliding window)
- Find all pairs in a sorted list that sum to T (two pointers)

---

### Week 6 — `sep-w2` · Tutor (Average) · "collections & itertools Deep Dive"
**Topic:** `Counter` (most common, subtract), `defaultdict` (grouping), `deque` (efficient popleft), `heapq` (min-heap push/pop, `nlargest`/`nsmallest`), `itertools.permutations`, `itertools.combinations`, `itertools.groupby`, `itertools.chain`
**Strategic rationale:** These modules reduce complex algorithmic problems to 3–5 lines. A student who doesn't know `heapq` writes a manual priority queue in Python — slow, error-prone under pressure.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Find the top 3 most frequent elements in a list (`Counter` + `most_common`)
- Group words by their first letter using `defaultdict(list)`
- Generate all combinations of 3 elements from a list of N using `itertools.combinations`

---

### Week 7 — `sep-w3` · Tutor (Difficult) · "Recursion, Memoization & Dynamic Programming"
**Topic:** Recursive patterns (divide and conquer, Fibonacci), `functools.lru_cache` / `@cache` for memoization, DP fundamentals: top-down (memoization) vs. bottom-up (tabulation), classic DP problems: Fibonacci (O(N)), 0/1 Knapsack, Longest Common Subsequence (LCS), Coin Change
**Strategic rationale:** DP is the hardest category in Python algorithmic contests and the one most students skip. Even a partial DP solution (memoized recursion) outperforms a brute-force O(2ⁿ) in scoring.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Fibonacci sequence using `@cache` — explain why it's O(N) not O(2ⁿ)
- 0/1 Knapsack: top-down memoized recursive solution, then rewrite as bottom-up DP table
- Longest Common Subsequence of two strings — identify the recurrence relation first

---

### Week 8 — `sep-w4` · Assessment (Difficult) · "Algorithm Pressure Test (45 min)"
**Template:** `AI Proctor — Practical Coding Assessment`
**Challenges:**
1. Given a list of N coins and a target T, find the minimum number of coins to make T (Coin Change DP). N, T ≤ 1000.
2. Given a string S, find the length of its Longest Increasing Subsequence if you treat each character as its ASCII value. Use DP in O(N²).

---

### Week 9 — `oct-sprint` · Tutor (Difficult) · "Graph Algorithms in Python"
**Topic:** Adjacency list using `defaultdict(list)`, BFS with `deque`, DFS with explicit stack or recursion, Dijkstra's shortest path using `heapq`, detecting cycles, topological sort (Kahn's algorithm)
**Strategic rationale:** Graph problems are the hardest algorithmic category and consistently appear in IT olympiad Difficult tiers. Python's `defaultdict` + `heapq` combination makes graph implementations shorter than Java's equivalent.
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Build a graph from edge input, BFS from source S, print shortest distances
- Dijkstra's algorithm using `heapq` — step through it on a weighted graph of 5 nodes
- Detect if a directed graph has a cycle using DFS with visited/in-stack tracking

---

### Week 10 — `oct-sprint` · Tutor (Difficult) · "String Algorithms & Regex"
**Topic:** String slicing patterns, palindrome detection, substring search (KMP concept), `re` module: `re.findall()`, `re.search()`, `re.sub()`, `re.match()`, compiled patterns, named groups
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Parse a log file extracting timestamps and error levels using `re.findall()` with named groups
- Find all email addresses in a text blob using regex
- Implement KMP prefix function, explain why it's O(N+M) vs. O(N*M) naive

---

### Week 11 — `oct-sprint` · Assessment (Full Mock) · "Provisional Mock 1 (90 min, 5–6 problems)"
**Topic:** Escalating difficulty: 2 Easy (list/dict manipulation), 2 Average (sliding window + DP), 2 Difficult (graph + regex)
**Template:** `AI Proctor — Practical Coding Assessment`
**Runtime format:** `python3 file.py < input.txt` for each problem

---

### Week 12 — `oct-sprint` · Journal (Captain-facing) · "Mechanics Checkpoint"
**Topic:** Confirm whether official 2026 Python contest mechanics have been released. If yes, rebuild November content around the real format immediately. If not, document what assumptions are being carried forward.
**Template:** `Journal Reflection Template`

---

### Week 13 — `nov-final` · Drill (Easy) · "Weak-Spot Re-Solve"
**Topic:** Re-solve 2–3 problems from October's miss-log untimed — rebuilding confidence and reinforcing the correct approach
**Template:** `AI Instructor — Friendly & Warm`

---

### Week 14 — `nov-final` · Journal · "Pre-Event Import Checklist"
**Topic:** Confirm allowed environment (IDE vs. plain text → changes everything), personal standard-library cheat-sheet (`sys.stdin` fast input, `from collections import Counter, deque`, `import heapq`), "read the whole problem first" discipline
**Template:** `Journal Reflection Template`

---
---

## Domain 6: Computer Networking (`net`)
> **Contest format:** Individual · Pending official mechanics · Expected format: Cisco Packet Tracer topology builds + written subnet calculations + CLI configuration
>
> **What wins:** VLSM arithmetic precision, IOS CLI muscle memory (device hardening, IP addressing, routing), and calm troubleshooting methodology. Students who hesitate on subnet math or forget interface syntax lose whole sections of the scoring rubric.

### Week 1 — `july-diagnostic` · Tutor (Easy) · "Networking Baseline"
**Topic:** OSI model recap (7 layers, each name + function + example device/protocol), TCP/IP 4-layer model, IP address classes (A/B/C), binary-to-decimal IP conversion, simple /24 subnet identification
**Template:** `AI Instructor — Adaptive Explorer`
**Prompt focus:** Given IP `192.168.10.45/24`, identify network address, broadcast, first and last usable host. Diagnose if the student can do this mentally or needs the formula.

---

### Week 2 — `aug-w1` · Tutor (Easy) · "IP Addressing & CIDR Fundamentals"
**Topic:** CIDR notation, subnet mask in binary and dotted-decimal, finding network/broadcast/host range for any /prefix, `2ⁿ – 2` host count formula, private IP ranges (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.0/8)
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Given `172.16.45.200/20`, find the network address, broadcast, subnet mask, and number of usable hosts
- List the 5 private IP address ranges from memory
- Convert 255.255.240.0 to prefix notation (/?)

---

### Week 3 — `aug-w2` · Tutor (Average) · "FLSM Subnetting"
**Topic:** Fixed-Length Subnet Masking — dividing a classful network into equal-size subnets, subnet increment calculation, subnet table construction (network, first host, last host, broadcast for each subnet)
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Divide `192.168.1.0/24` into 8 equal subnets. Build the full subnet table for all 8.
- Given `10.0.0.0/8`, create 16 subnets. What is the new prefix? What is the subnet increment?
- A host is at `192.168.5.100/27`. Which subnet does it belong to? What is its broadcast address?

---

### Week 4 — `aug-w3` · Assessment (Average) · "FLSM Speed Test (15 questions)"
**Topic:** Rapid FLSM subnetting calculations — find subnet, broadcast, usable range, wildcard mask
**Template:** `Assessment Mode Rubric`
**Format:** 15 questions, 60-second max per question. Scored individually.

---

### Week 5 — `sep-w1` · Tutor (Average) · "VLSM — Variable-Length Subnet Masking"
**Topic:** VLSM methodology — allocate smallest-first (sort department host requirements descending, allocate from largest block down), calculate each subnet boundary precisely, avoid overlap
**Strategic rationale:** VLSM is the exam standard for networking contests and the single highest-scoring section of a Packet Tracer build assessment. A student who cannot VLSM manually loses the addressing section entirely.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:**
- Given `192.168.10.0/24` and departments requiring 60, 30, 14, and 2 hosts respectively, allocate VLSM subnets with zero waste. Show all work.
- Verify no address range overlap between the four subnets you created
- Given a completed VLSM table, identify which host belongs to which subnet

---

### Week 6 — `sep-w2` · Tutor (Average) · "Wildcard Masks & ACL Logic"
**Topic:** Wildcard mask construction (inverse of subnet mask), wildcard mask for a host (`0.0.0.0`), wildcard for a subnet (`255 – subnet octet`), standard vs. extended ACLs (conceptual), placement rule (standard = close to destination, extended = close to source)
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Convert subnet mask `255.255.252.0` to wildcard mask
- Write the ACL wildcard to permit all hosts in `172.16.48.0/20`
- Explain where to place a standard ACL that blocks traffic from host X to network Y

---

### Week 7 — `sep-w3` · Tutor (Difficult) · "Cisco IOS CLI From Scratch"
**Topic:** Router/switch basic configuration: `enable` / `conf t`, hostname, enable secret (`enable secret <pass>`), console line (`line con 0`, `password`, `login`), VTY lines (`line vty 0 4`, `password`, `login`, `transport input ssh`), service password-encryption, MOTD banner (`banner motd`), interface IP addressing (`interface GigabitEthernet0/0`, `ip address <ip> <mask>`, `no shutdown`), `show ip interface brief`, `copy run start`
**Strategic rationale:** IOS CLI muscle memory is non-negotiable. Students who hesitate on CLI mode navigation (user EXEC → privileged EXEC → global config → interface config) waste critical time. Every command must be typed without reference material.
**Template:** `AI Instructor — Strict & Critical`
**Prompt focus:** Build a complete device configuration from scratch: hostname, passwords, banner, interface addressing, SSH-only VTY, save. Student types every line from memory — no copy-paste.

---

### Week 8 — `sep-w4` · Assessment (Difficult) · "Packet Tracer VLSM Build"
**Topic:** Given a topology (2 routers, 3 LANs with specific host requirements), design the VLSM addressing scheme, implement it in Packet Tracer (interface addressing, `no shutdown`), verify end-to-end ping
**Template:** `AI Proctor — Practical Coding Assessment`
**Format:** Student builds in Packet Tracer, screenshots the `show ip interface brief` and successful ping results.

---

### Week 9 — `oct-sprint` · Tutor (Difficult) · "Routing Protocols — Static, RIP, OSPF"
**Topic:** Static routing (`ip route <network> <mask> <next-hop>`), default route (`ip route 0.0.0.0 0.0.0.0 <next-hop>`), RIPv2 configuration (`router rip`, `version 2`, `network <classful>`, `no auto-summary`), OSPF basics (`router ospf 1`, `network <net> <wildcard> area 0`), verify with `show ip route`, `show ip protocols`, `ping`
**Template:** `Tutor Mode Template`
**Prompt focus:**
- Configure static routes on Router A to reach networks behind Router B
- Add RIPv2 on a 3-router topology, verify route propagation
- Explain when you would choose OSPF over RIPv2

---

### Week 10 — `oct-sprint` · Assessment (Full Mock) · "Mock 1 — Full Topology Build"
**Topic:** Multi-router topology, VLSM addressing, static or RIPv2 routing, device hardening (hostname, passwords, banner, SSH), verified end-to-end connectivity
**Template:** `AI Proctor — Practical Coding Assessment`
**Format:** Student builds in Packet Tracer under timed conditions, screenshots all verification commands.

---

### Week 11 — `oct-sprint` · Assessment (Difficult) · "Troubleshooting Round"
**Topic:** A partially-broken topology (wrong subnet mask on one interface, missing route entry, mismatched duplex/speed, missing `no shutdown`) — diagnose and fix using only `show` commands (`show ip interface brief`, `show ip route`, `show running-config`) + `ping` / `traceroute`
**Template:** `Assessment Mode Rubric`
**Rubric:** Each fault found and fixed (4 faults × 25 pts = 100 pts)

---

### Week 12 — `oct-sprint` · Assessment (Full Mock) · "Mock 2 — Combined Challenge"
**Topic:** VLSM design + full CLI build + device hardening + one intentional seeded fault to find — closest simulation to actual contest day
**Template:** `AI Proctor — Practical Coding Assessment`

---

### Week 13 — `nov-final` · Drill (Easy) · "CLI Command Recall Flash Drill"
**Topic:** Rapid-fire "what command does X" — no topology building, just CLI syntax recall: `show version`, `show ip interface brief`, `debug ip rip`, `copy run start`, `erase startup-config`, `reload`
**Template:** `AI Instructor — Friendly & Warm`

---

### Week 14 — `nov-final` · Journal · "Contest-Day Diagnostics"
**Topic:** Packet Tracer version check, personal CLI command cheat-sheet for mental rehearsal, "diagnose before you panic" order: physical/IP layer first → routing table → services, pre-contest mental warm-up
**Template:** `Journal Reflection Template`

---
---

## Cross-Domain: Race Week (Week 14, All Domains)

### Week 14 — `nov-final` · Journal (All domains) · "Race Week Mindset Brief"
**Topic (domain-agnostic):**
- Sleep and logistics check for travel to the venue
- A written "what I'm proudest of improving since July" reflection (3 bullets minimum) — closes the season on growth, not just outcome
- Reminder that practice data never decided the team — the proctored mocks did. Nothing changes that now. The goal this week is composure, not new material.
**Template:** `Journal Reflection Template`

---

## Summary: Milestone Count by Domain

| Domain | Weeks | Total Milestones | Key Hard Topics |
|:---|:---|:---|:---|
| Java | 1–14 | 14 | Sliding window, prefix sums, backtracking, BFS/DFS, Kadane's, Sieve, KMP |
| Database | 1–14 | 14 | Correlated subqueries, normalization (1NF–BCNF), transactions, window functions, CTEs |
| Web Design | 1–14 | 14 | CSS Grid, CSS-only hamburger, media queries, responsive design, speed builds |
| Quiz Bee | 1–14 | 14 | History, number systems, OS scheduling, DSA theory, networking, cybersecurity, SE, AI/Cloud |
| Python | 1–14 | 14 | collections/itertools, DP, graph algorithms (Dijkstra, BFS/DFS), regex, KMP |
| Networking | 1–14 | 14 | VLSM, IOS CLI, routing protocols (RIP/OSPF), ACLs, troubleshooting methodology |
| Cross-Domain | 14 | 1 | Race-week mindset |
| **Total** | | **99 milestones** | |

---

## Open Items Before Seeding

1. **Python & Networking mechanics:** Still pending official 2026 guidelines. Week 12 of both is a hard checkpoint. If official docs drop before then, rebuild Weeks 12–14 immediately around the confirmed format.
2. **DB may now be pair-based:** At least one recent edition ran it as a 2-person team event. If confirmed, Week 11's full mock needs a role-split element (Partner A: DQL/JOINs; Partner B: DML/transactions).
3. **Quiz Bee topic updates:** Organizers occasionally update topic coverage. Have the captain do a 30-minute review of the last 2 editions' question sets and flag any new topic areas before Week 9.
