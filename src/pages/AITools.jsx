import { useState, useEffect } from 'react'
import { Sparkles, FileText, FileQuestion, BookOpen, Send, Loader2, Copy, CheckCircle2, RefreshCw, ListChecks, Mail, Smile, Download, BrainCircuit, ClipboardList, Newspaper, FlaskConical, BookMarked, PenLine, GraduationCap, Heart, Lightbulb, Calendar, Share2, MessageCircle, Mic, MicOff, Globe } from 'lucide-react'
import { generateAIContent } from '../utils/aiService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../contexts/AuthContext'
import { useGamification } from '../contexts/GamificationContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { db } from '../utils/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export const tools = [
  {
    id: 'lesson-plan',
    title: 'Lesson Planner',
    description: 'Generate comprehensive lesson plans with objectives, activities, and assessments.',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-600',
    inputs: [
      { id: 'topic', label: 'Topic / Subject', type: 'text', placeholder: 'e.g. The Cold War, Fractions' },
      { id: 'standard', label: 'Educational Standard', type: 'text', placeholder: 'e.g. Common Core, NGSS, State' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Kindergarten', 'Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)', 'Higher Education'] },
      { id: 'duration', label: 'Class Duration', type: 'text', placeholder: 'e.g. 45 Mins, 1.5 Hours' }
    ],
    promptTemplate: (data) => `Create an extremely structured lesson plan for a ${data.grade} class about "${data.topic}". 
Curriculum Standard: ${data.standard || 'General'}. Class Duration: ${data.duration || 'Standard Session'}.
YOU MUST STRICTLY FOLLOW THIS MARKDOWN FORMAT:

# Lesson Plan: ${data.topic}

### 🎯 Learning Objectives
* Use a bulleted list for Bloom's Taxonomy objectives linking to ${data.standard}.

### 📦 Required Materials
* Bulleted list of materials

### ⏱️ Hook/Introduction (${data.duration ? 'Time accordingly' : '5-10 mins'})
Provide detailed steps.

### 📖 Direct Instruction
Provide detailed steps.

### 🤝 Guided Practice
Provide detailed steps.

### ✍️ Independent Practice
Provide detailed steps.

### 🏁 Assessment/Closure
Provide detailed steps.

---
> **💡 Differentiation Strategies:** Provide a brief concluding paragraph inside a blockquote detailing accommodations.`
  },
  {
    id: 'worksheet',
    title: 'Worksheet Generator',
    description: 'Create customized worksheets with various questions based on any topic.',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    inputs: [
      { id: 'topic', label: 'Topic', type: 'text', placeholder: 'e.g. Photosynthesis, Trigonometry' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Kindergarten', 'Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'type', label: 'Question Format', type: 'select', options: ['Mix of All', 'Multiple Choice Only', 'Short Answer Only'] }
    ],
    promptTemplate: (data) => `Create a student-facing worksheet for a ${data.grade} class about "${data.topic}". Focus on ${data.type} format.
YOU MUST STRICTLY FOLLOW THIS MARKDOWN FORMAT:

# Worksheet: ${data.topic}
*Name: _______________________ Date: ____________*

Provide a brief, engaging 2-sentence introduction.

### Section 1: Core Questions
Format as a numbered list.
1. Question text
   A) Option A
   B) Option B
*(Provide 5-8 questions based on format)*

### Section 2: Application
Format as a numbered list with clear spacing instructions for written answers.

---
> **🔑 Answer Key:**
> Provide all answers clearly inside this blockquote block at the very bottom.`
  },
  {
    id: 'rubric',
    title: 'Rubric Creator',
    description: 'Generate detailed grading rubrics with distinct evaluation criteria.',
    icon: ListChecks,
    color: 'from-violet-500 to-purple-600',
    inputs: [
      { id: 'assignment', label: 'Assignment Type', type: 'text', placeholder: 'e.g. Persuasive Essay, Science Project' },
      { id: 'topic', label: 'Specific Topic', type: 'text', placeholder: 'e.g. Climate Change' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)', 'Higher Education'] },
      { id: 'scale', label: 'Grading Scale', type: 'select', options: ['4-Point Scale (Exceeds, Meets, Approaching, Below)', '100-Point Percentage Scale'] }
    ],
    promptTemplate: (data) => `Create a comprehensive grading rubric for a ${data.grade} ${data.assignment} about "${data.topic}". Use a ${data.scale}.
YOU MUST STRICTLY FORMAT THE RESPONSE AS A SINGLE, DETAILED MARKDOWN TABLE.

Include 4-5 evaluation criteria (e.g., Content, Organization, Mechanics) as the rows.
Ensure the columns match the requested grading scale.

Output ONLY the markdown table and a brief 1-sentence instruction on how to use it.`
  },
  {
    id: 'report-card',
    title: 'Report Card Comments',
    description: 'Generate professional, empathetic narrative comments for student report cards.',
    icon: FileText,
    color: 'from-fuchsia-500 to-purple-600',
    inputs: [
      { id: 'studentName', label: 'Student First Name', type: 'text', placeholder: 'e.g. Alex' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Kindergarten', 'Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'strengths', label: 'Key Strengths', type: 'textarea', placeholder: 'e.g. Great participation, highly creative...' },
      { id: 'improvement', label: 'Areas for Improvement', type: 'textarea', placeholder: 'e.g. Needs to focus during independent work...' }
    ],
    promptTemplate: (data) => `Generate 2 highly refined, professional report card comment options for a ${data.grade} student named ${data.studentName}.
Strengths to highlight: ${data.strengths}
Areas to improve: ${data.improvement}

YOU MUST STRICTLY USE THIS FORMAT:

### Option 1: Direct & Comprehensive
[A 4-5 sentence professional paragraph praising the student's specific strengths and adding a constructive goal based on improvements]

### Option 2: Warm & Empathetic 
[A 4-5 sentence highly empathetic paragraph discussing the strengths and framing the support plan for their growth area]

---
> **💡 Tip:** Always start with a positive note before addressing areas of growth.`
  },
  {
    id: 'doubt-solver',
    title: 'AI Doubt Solver',
    description: 'Instantly get student-friendly explanations for complex concepts and hard questions.',
    icon: BrainCircuit,
    color: 'from-pink-500 to-rose-600',
    inputs: [
      { id: 'doubt', label: 'The Student\'s Doubt', type: 'textarea', placeholder: 'e.g. Why is the sky blue? Or how do fractions work?' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Kindergarten', 'Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)', 'Higher Ed'] },
      { id: 'tone', label: 'Explanation Tone', type: 'select', options: ['Simple & Fun', 'Real-world Analogies', 'Highly Technical & Strict'] }
    ],
    promptTemplate: (data) => `You are an expert teacher for a ${data.grade} student. They have asked a doubt: "${data.doubt}".
Use a "${data.tone}" tone. Provide a clear, engaging, and age-appropriate explanation.
YOU MUST STRICTLY USE THIS FORMAT:

### 🧠 The Simple Answer
[A 2-3 sentence explanation directly answering the question]

### 🔍 Let's Dive Deeper
[A more detailed explanation breaking it down beautifully based on the requested tone.]

### 📝 Quick Knowledge Check
[Provide 1 simple question at the end to check if they understood]

---
> **Tip for Teachers:** [How a teacher can best explain this concept live in class]`
  },
  {
    id: 'behavior',
    title: 'Classroom Management',
    description: 'Get actionable, psychological strategies for specific classroom behavioral situations.',
    icon: BrainCircuit,
    color: 'from-red-500 to-rose-600',
    inputs: [
      { id: 'behavior', label: 'Describe the Behavior', type: 'textarea', placeholder: 'e.g. Student keeps interrupting others during reading time.' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Kindergarten', 'Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'frequency', label: 'Frequency of Behavior', type: 'select', options: ['Rarely', 'Daily/Consistent', 'Severe/Constant Drop-in'] }
    ],
    promptTemplate: (data) => `You are an expert behavioral psychologist and veteran teacher. A teacher of a ${data.grade} class is facing this behavioral issue: "${data.behavior}". The frequency is: ${data.frequency}.
Provide actionable, empathetic, and evidence-based strategies.
YOU MUST STRICTLY USE THIS FORMAT:

### 🔍 Understanding the Root Cause
[Brief paragraph explaining the psychological "why" behind this behavior, factoring in the frequency]

### 🛑 In-the-Moment Response (De-escalation)
[What to do exactly when it happens. Give 2 bullet points.]

### 🌱 Long-Term Strategy (Prevention)
1. [Preventive strategy 1]
2. [Preventive strategy 2]

---
> **💬 Script Idea:** "When you say/do [X], the consequence is [Y]. Let's try [Z] instead."`
  },
  {
    id: 'quiz',
    title: 'Quiz Maker',
    description: 'Generate quick quizzes or assessments to check student understanding.',
    icon: FileQuestion,
    color: 'from-orange-500 to-red-600',
    inputs: [
      { id: 'topic', label: 'Quiz Topic', type: 'text', placeholder: 'e.g. Photosynthesis, World War II' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'count', label: 'Number of Questions', type: 'select', options: ['5 Questions', '10 Questions', '15 Questions', '20 Questions'] },
      { id: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy (Recall)', 'Medium (Understanding)', 'Hard (Application & Analysis)'] }
    ],
    promptTemplate: (data) => `Create a formal quiz for a ${data.grade} class about "${data.topic}". Generate ${data.count}. Difficulty: ${data.difficulty}.
YOU MUST STRICTLY FOLLOW THIS MARKDOWN FORMAT:

# Quiz: ${data.topic}

Provide questions mixing True/False, Multiple Choice, and Fill-in-the-blank. Use a numbered list.
Use --- to separate sections.

### Grading Rubric
Create a highly structured Markdown Table detailing how to grade the quiz. 
| Question Type | Points | Criteria |
|---|---|---|

---
> **Answer Key:** Provide all correct answers inside this blockquote.`
  },
  {
    id: 'parent-email',
    title: 'Parent Email Drafter',
    description: 'Draft professional, empathetic emails regarding student progress or incidents.',
    icon: Mail,
    color: 'from-cyan-500 to-blue-600',
    inputs: [
      { id: 'purpose', label: 'Purpose of Email', type: 'select', options: ['Academic Progress Update', 'Behavioral Concern', 'Positive Feedback / Appreciation', 'Parent-Teacher Meeting Invitation', 'Missing Homework Notice', 'Field Trip Permission'] },
      { id: 'studentName', label: 'Student Name', type: 'text', placeholder: 'e.g. Aarav, Sarah' },
      { id: 'details', label: 'Key Details to Include', type: 'textarea', placeholder: 'e.g. Student scored 95% in midterm, or has been absent 5 days...' },
      { id: 'tone', label: 'Tone', type: 'select', options: ['Warm & Supportive', 'Formal & Direct', 'Urgent & Concerned'] }
    ],
    promptTemplate: (data) => `Draft a professional, ${data.tone} email to the parents of a student named ${data.studentName}. Purpose: ${data.purpose}.
Key details: ${data.details}

YOU MUST STRICTLY USE THIS FORMAT:

**Subject:** [Insert clear subject line here]

Dear Parent/Guardian of ${data.studentName},

[Insert 2-3 beautifully written paragraphs. Keep it constructive and empathetic.]

Warm regards,

[Teacher Name]
[School/Grade Level]`
  },
  {
    id: 'icebreaker',
    title: 'Icebreaker Activities',
    description: 'Generate fun, engaging 5-minute activities to start or energize the class.',
    icon: Smile,
    color: 'from-amber-400 to-orange-500',
    inputs: [
      { id: 'topic', label: 'Topic or Theme (Optional)', type: 'text', placeholder: 'e.g. Solar System, First Day of School' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Kindergarten', 'Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'type', label: 'Activity Type', type: 'select', options: ['Quick Game (5 mins)', 'Group Discussion Starter', 'Movement-Based Energizer', 'Creative Thinking Prompt'] }
    ],
    promptTemplate: (data) => `Generate 3 fun, age-appropriate ${data.type} icebreaker activities for a ${data.grade} class${data.topic ? ` introducing "${data.topic}"` : ''}.
YOU MUST STRICTLY USE THIS FORMAT:

### 1. [Catchy Activity Name] *(⏳ 5 mins)*
**Materials:** [List materials or "None"]
**How to play:** [Brief paragraph of clear instructions]
**Why it works:** [1 sentence on pedagogical value]

### 2. [Catchy Activity Name] *(⏳ X mins)*
...

### 3. [Catchy Activity Name] *(⏳ X mins)*
...`
  },
  {
    id: 'pbl',
    title: 'PBL Project Designer',
    description: 'Design multi-day project-based learning assignments connecting concepts to the real world.',
    icon: Sparkles,
    color: 'from-amber-500 to-yellow-600',
    inputs: [
      { id: 'topic', label: 'Core Topic', type: 'text', placeholder: 'e.g. Water Conservation, Ancient Civilizations' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'duration', label: 'Project Duration', type: 'select', options: ['3 Days', '1 Week', '2 Weeks', '1 Month'] },
      { id: 'deliverable', label: 'Final Deliverable Type', type: 'select', options: ['Presentation / PPT', 'Physical Model / Prototype', 'Written Report', 'Video / Documentary', 'Exhibition / Poster'] }
    ],
    promptTemplate: (data) => `Design a comprehensive Project-Based Learning (PBL) activity for a ${data.grade} class centered around "${data.topic}". Duration: ${data.duration}. Final deliverable: ${data.deliverable}.
YOU MUST STRICTLY FORMAT AS FOLLOWS:

# PBL Design: ${data.topic}
**Duration:** ${data.duration} | **Deliverable:** ${data.deliverable}

### 🌍 The Real-World Driving Question
[A compelling, open-ended question that frames the project]

### 🎯 The Final Product / Deliverable
[What the students will actually create or present]

### 🪜 Milestone Breakdown
1. **Phase 1: The Hook & Research** - [Brief plan]
2. **Phase 2: Creation/Drafting** - [Brief plan]
3. **Phase 3: Peer Review** - [Brief plan]
4. **Phase 4: Presentation/Action** - [Brief plan]

---
> **🛠️ Resources Needed:** [Bullet list of unique materials]`
  },
  {
    id: 'differentiated',
    title: 'Differentiated Lesson Split',
    description: 'Break a single topic down into 3 levels: Remedial, Core, and Enrichment.',
    icon: ListChecks,
    color: 'from-emerald-400 to-green-600',
    inputs: [
      { id: 'topic', label: 'Topic', type: 'text', placeholder: 'e.g. Fractions, Photosynthesis' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'focus', label: 'Differentiation Focus', type: 'select', options: ['By Learning Ability', 'By Learning Style (Visual/Auditory/Kinesthetic)', 'By Language Level (ELL Support)'] }
    ],
    promptTemplate: (data) => `Take the topic: "${data.topic}" for a ${data.grade} class and differentiate it into 3 distinct learning tiers. Focus: ${data.focus}.
YOU MUST STRICTLY FORMAT AS FOLLOWS:

# Differentiated Plan: ${data.topic}

### 🌱 Tier 1: Remedial (Needs Support)
**Objective:** [Simplified goal]
**Activity:** [A highly scaffolded, step-by-step 15 min activity]
**Teacher Focus:** [What the teacher should do with this group]

### 🌿 Tier 2: Core (On-Level)
**Objective:** [Standard goal]
**Activity:** [A standard independent/group activity]
**Teacher Focus:** [Checking for understanding]

### 🌳 Tier 3: Enrichment (High Achievers)
**Objective:** [Advanced goal/Bloom's taxonomy]
**Activity:** [A challenging extension activity requiring critical thinking, NOT just more work]
**Teacher Focus:** [Facilitating peer review or complex questions]`
  },
  {
    id: 'notice-writer',
    title: 'Notice / Circular Writer',
    description: 'Draft official school notices, circulars, and announcements instantly.',
    icon: FileText,
    color: 'from-slate-600 to-slate-800',
    inputs: [
      { id: 'type', label: 'Notice Type', type: 'select', options: ['Holiday Notice', 'Exam Schedule', 'Fee Reminder', 'Event Announcement', 'General Circular', 'Dress Code / Uniform', 'Discipline Notice'] },
      { id: 'details', label: 'Key Details', type: 'textarea', placeholder: 'e.g. Annual sports day on 15th March, classes suspended...' },
      { id: 'audience', label: 'Target Audience', type: 'select', options: ['All Students', 'Parents/Guardians', 'Staff / Faculty', 'Specific Class / Section'] },
      { id: 'schoolName', label: 'School Name', type: 'text', placeholder: 'e.g. Delhi Public School' }
    ],
    promptTemplate: (data) => `Draft a professional, formal school ${data.type} for ${data.audience}. School: ${data.schoolName || '[School Name]'}.
Details: ${data.details}

YOU MUST STRICTLY USE THIS FORMAT:

# ${data.schoolName || '[School Name]'}
## NOTICE / CIRCULAR
**Date:** ${new Date().toLocaleDateString()}
**To:** ${data.audience}
**Subject:** [Clear subject line for ${data.type}]

[2-3 formal paragraphs with all necessary details]

**Important Points:**
1. [Key point 1]
2. [Key point 2]

---
*Issued by the Principal / Administration*
*${data.schoolName || '[School Name]'}*`
  },
  {
    id: 'assembly-speech',
    title: 'Assembly Speech Writer',
    description: 'Generate engaging morning assembly speeches, thought-of-the-day, or special day addresses.',
    icon: BookOpen,
    color: 'from-indigo-500 to-blue-700',
    inputs: [
      { id: 'occasion', label: 'Occasion / Topic', type: 'text', placeholder: 'e.g. Republic Day, Environment Day, Farewell' },
      { id: 'duration', label: 'Speech Duration', type: 'select', options: ['2 Minutes (Short)', '5 Minutes (Standard)', '10 Minutes (Detailed)'] },
      { id: 'speaker', label: 'Who is Speaking?', type: 'select', options: ['Student (Class 6-8)', 'Student (Class 9-12)', 'Teacher', 'Principal'] },
      { id: 'tone', label: 'Tone', type: 'select', options: ['Inspirational & Motivational', 'Informative & Educational', 'Humorous & Light', 'Patriotic & Emotional'] }
    ],
    promptTemplate: (data) => `Write a ${data.duration} ${data.tone} assembly speech about "${data.occasion}" to be delivered by a ${data.speaker}.

YOU MUST STRICTLY USE THIS FORMAT:

# Assembly Speech: ${data.occasion}
**Speaker:** ${data.speaker} | **Duration:** ${data.duration}

---

**Opening Greeting:**
[Formal greeting appropriate for school assembly]

**Introduction:**
[Hook the audience with a powerful quote, fact, or question about ${data.occasion}]

**Main Body:**
[2-3 well-structured paragraphs covering the significance, history, or message of the occasion]

**Closing / Call to Action:**
[An inspiring conclusion with a call to action for the students]

---
> **💡 Thought of the Day:** [A relevant, powerful quote related to the topic]`
  },
  {
    id: 'exam-paper',
    title: 'Exam Paper Generator',
    description: 'Generate structured exam papers with sections, marks distribution, and answer keys.',
    icon: FileQuestion,
    color: 'from-rose-500 to-pink-700',
    inputs: [
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Science, Mathematics, English' },
      { id: 'topics', label: 'Topics to Cover', type: 'textarea', placeholder: 'e.g. Chapter 3: Light, Chapter 5: Acids & Bases' },
      { id: 'grade', label: 'Grade Level', type: 'select', options: ['Elementary (1-5)', 'Middle School (6-8)', 'High School (9-12)'] },
      { id: 'totalMarks', label: 'Total Marks', type: 'select', options: ['20 Marks (Unit Test)', '40 Marks (Mid-Term)', '80 Marks (Final Exam)', '100 Marks (Board Style)'] },
      { id: 'duration', label: 'Time Allowed', type: 'select', options: ['30 Minutes', '1 Hour', '2 Hours', '3 Hours'] }
    ],
    promptTemplate: (data) => `Create a structured ${data.totalMarks} exam paper for ${data.grade} ${data.subject}. Topics: ${data.topics}. Time: ${data.duration}.

YOU MUST STRICTLY USE THIS FORMAT:

# ${data.subject} Examination
**Grade:** ${data.grade} | **Total Marks:** ${data.totalMarks} | **Time:** ${data.duration}
*General Instructions: Attempt all questions. Marks are indicated against each question.*

---

### Section A: Objective Type (1 mark each)
[5-10 MCQ / True-False / Fill-in-the-blank questions]

### Section B: Short Answer (2-3 marks each)
[4-6 short answer questions]

### Section C: Long Answer (5 marks each)
[2-4 detailed answer questions]

### Section D: Application / HOTS (Higher Order Thinking)
[1-2 case-study or application-based questions]

---
> **🔑 Answer Key & Marking Scheme:**
> Provide complete answers with mark distribution inside this blockquote.`
  },
  {
    id: 'syllabus-planner',
    title: 'Syllabus Planner',
    description: 'Generate a complete term-wise or month-wise syllabus breakdown for any subject.',
    icon: Calendar,
    color: 'from-teal-500 to-cyan-600',
    inputs: [
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Mathematics, Science, English' },
      { id: 'grade', label: 'Grade / Class', type: 'select', options: ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12'] },
      { id: 'board', label: 'Board / Curriculum', type: 'select', options: ['CBSE', 'ICSE', 'State Board', 'IB', 'General'] },
      { id: 'duration', label: 'Plan Duration', type: 'select', options: ['1 Month', 'Full Term (3 Months)', 'Full Academic Year'] }
    ],
    promptTemplate: (data) => `Create a detailed ${data.duration} syllabus plan for ${data.grade} ${data.subject} following the ${data.board} curriculum.
YOU MUST STRICTLY USE THIS FORMAT:

# Syllabus Plan: ${data.subject} (${data.grade})
**Board:** ${data.board} | **Duration:** ${data.duration}

### Month/Week Breakdown
Create a detailed Markdown Table:
| Week | Topic / Chapter | Sub-Topics | Activities | Assessment |
|------|----------------|------------|------------|------------|

### Key Learning Outcomes
* [Bulleted list of outcomes]

---
> **📌 Note:** Include revision weeks and exam prep periods.`
  },
  {
    id: 'comprehension',
    title: 'Comprehension Passage Maker',
    description: 'Generate reading passages with comprehension questions for language classes.',
    icon: BookMarked,
    color: 'from-sky-500 to-blue-600',
    inputs: [
      { id: 'topic', label: 'Passage Topic', type: 'text', placeholder: 'e.g. The Rainforest, Space Exploration' },
      { id: 'grade', label: 'Reading Level', type: 'select', options: ['Class 1-3 (Beginner)', 'Class 4-6 (Intermediate)', 'Class 7-9 (Advanced)', 'Class 10-12 (Expert)'] },
      { id: 'language', label: 'Language', type: 'select', options: ['English', 'Hindi', 'Simple English (ESL)'] },
      { id: 'length', label: 'Passage Length', type: 'select', options: ['Short (100-150 words)', 'Medium (200-300 words)', 'Long (400-500 words)'] }
    ],
    promptTemplate: (data) => `Generate a ${data.length} ${data.language} reading comprehension passage about "${data.topic}" for ${data.grade} students.
YOU MUST STRICTLY USE THIS FORMAT:

# Reading Comprehension: ${data.topic}

[Write the passage here in ${data.language}]

---

### Questions:
1. **Factual:** [Direct recall question from the passage]
2. **Inferential:** [Question requiring reading between the lines]
3. **Vocabulary:** [Ask the meaning of a word used in the passage]
4. **Critical Thinking:** [Opinion-based question]
5. **Grammar:** [Identify a grammatical element from the passage]

---
> **🔑 Answer Key:**
> Provide model answers for all questions.`
  },
  {
    id: 'math-word-problems',
    title: 'Math Word Problems',
    description: 'Generate age-appropriate math word problems on any topic with step-by-step solutions.',
    icon: Lightbulb,
    color: 'from-yellow-500 to-orange-600',
    inputs: [
      { id: 'topic', label: 'Math Topic', type: 'text', placeholder: 'e.g. Fractions, Profit & Loss, Speed-Distance' },
      { id: 'grade', label: 'Class Level', type: 'select', options: ['Class 1-3', 'Class 4-6', 'Class 7-8', 'Class 9-10', 'Class 11-12'] },
      { id: 'count', label: 'Number of Problems', type: 'select', options: ['5 Problems', '10 Problems', '15 Problems'] },
      { id: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy (Direct Application)', 'Medium (Multi-step)', 'Hard (HOTS / Olympiad Level)'] }
    ],
    promptTemplate: (data) => `Generate ${data.count} math word problems on "${data.topic}" for ${data.grade} students. Difficulty: ${data.difficulty}.
YOU MUST STRICTLY USE THIS FORMAT:

# Math Word Problems: ${data.topic}

1. [Real-world scenario word problem]
2. [Another word problem]
...

---
> **🔑 Solutions (Step-by-Step):**
> **Problem 1:** [Show complete working with each step clearly explained]
> **Problem 2:** [...]
> Provide ALL solutions with complete step-by-step working.`
  },
  {
    id: 'story-writer',
    title: 'Story / Moral Story Writer',
    description: 'Generate engaging stories with moral lessons perfect for primary and middle school.',
    icon: Heart,
    color: 'from-pink-400 to-rose-500',
    inputs: [
      { id: 'theme', label: 'Story Theme / Moral', type: 'text', placeholder: 'e.g. Honesty, Kindness, Hard Work, Environment' },
      { id: 'grade', label: 'Age Group', type: 'select', options: ['Class 1-3 (Simple Language)', 'Class 4-6 (Intermediate)', 'Class 7-9 (Detailed)'] },
      { id: 'type', label: 'Story Type', type: 'select', options: ['Moral Story', 'Folktale / Fable', 'Adventure Story', 'Real-life Inspirational'] },
      { id: 'length', label: 'Length', type: 'select', options: ['Short (1 page)', 'Medium (2 pages)', 'Long (3+ pages)'] }
    ],
    promptTemplate: (data) => `Write a ${data.length} ${data.type} for ${data.grade} students on the theme of "${data.theme}".
YOU MUST STRICTLY USE THIS FORMAT:

# ${data.type}: [Creative Story Title]

[Write the complete story with vivid descriptions, dialogue, and a clear beginning, middle, and end]

---

### 🌟 Moral of the Story
[State the moral clearly in 1-2 sentences]

### 📝 Discussion Questions
1. [Question about the story]
2. [Question connecting to real-life]
3. [Creative extension question]`
  },
  {
    id: 'vocabulary-builder',
    title: 'Vocabulary Builder',
    description: 'Generate word lists with meanings, synonyms, antonyms, and usage sentences.',
    icon: PenLine,
    color: 'from-lime-500 to-green-600',
    inputs: [
      { id: 'topic', label: 'Topic / Theme', type: 'text', placeholder: 'e.g. Science vocabulary, Emotions, Travel' },
      { id: 'grade', label: 'Class Level', type: 'select', options: ['Class 1-3', 'Class 4-6', 'Class 7-9', 'Class 10-12'] },
      { id: 'count', label: 'Number of Words', type: 'select', options: ['10 Words', '15 Words', '20 Words', '25 Words'] }
    ],
    promptTemplate: (data) => `Generate a vocabulary list of ${data.count} for ${data.grade} students related to "${data.topic}".
YOU MUST STRICTLY FORMAT AS A MARKDOWN TABLE:

# Vocabulary Builder: ${data.topic}

| # | Word | Part of Speech | Meaning | Synonym | Antonym | Example Sentence |
|---|------|---------------|---------|---------|---------|------------------|
| 1 | ... | ... | ... | ... | ... | ... |

---
### Practice Exercise
Provide 5 fill-in-the-blank sentences using the above words.`
  },
  {
    id: 'recommendation-letter',
    title: 'Recommendation Letter',
    description: 'Write professional recommendation letters for students applying to colleges or scholarships.',
    icon: GraduationCap,
    color: 'from-blue-600 to-indigo-700',
    inputs: [
      { id: 'studentName', label: 'Student Name', type: 'text', placeholder: 'e.g. Priya Sharma' },
      { id: 'purpose', label: 'Letter Purpose', type: 'select', options: ['College Admission', 'Scholarship Application', 'Internship', 'Award Nomination', 'Transfer Certificate'] },
      { id: 'qualities', label: 'Key Qualities to Highlight', type: 'textarea', placeholder: 'e.g. Leadership, academic excellence, community service...' },
      { id: 'relationship', label: 'Your Relationship', type: 'select', options: ['Class Teacher', 'Subject Teacher', 'Principal', 'Mentor / Counselor'] }
    ],
    promptTemplate: (data) => `Write a professional ${data.purpose} recommendation letter for a student named ${data.studentName}. Written by their ${data.relationship}.
Key qualities: ${data.qualities}

YOU MUST STRICTLY USE THIS FORMAT:

**To Whom It May Concern,**

[3-4 paragraphs: Introduction of relationship, academic strengths, character/extra-curricular, and strong closing recommendation]

Sincerely,

[Teacher Name]
[Designation]
[School Name]
[Date]`
  },
  {
    id: 'class-newsletter',
    title: 'Class Newsletter',
    description: 'Generate weekly or monthly class newsletters to keep parents informed and engaged.',
    icon: Newspaper,
    color: 'from-purple-500 to-violet-600',
    inputs: [
      { id: 'className', label: 'Class / Section', type: 'text', placeholder: 'e.g. Class 5-B, Grade 8' },
      { id: 'period', label: 'Newsletter Period', type: 'select', options: ['This Week', 'This Month', 'This Term'] },
      { id: 'highlights', label: 'Key Highlights / Activities', type: 'textarea', placeholder: 'e.g. Science fair, new math chapter started, field trip planned...' },
      { id: 'tone', label: 'Tone', type: 'select', options: ['Warm & Friendly', 'Formal & Professional'] }
    ],
    promptTemplate: (data) => `Create a ${data.tone} class newsletter for ${data.className} covering ${data.period}.
Highlights: ${data.highlights}

YOU MUST STRICTLY USE THIS FORMAT:

# 📰 ${data.className} Newsletter
**Period:** ${data.period} | **Date:** ${new Date().toLocaleDateString()}

### 🌟 Highlights & Achievements
[Summarize key class activities and achievements]

### 📚 What We Learned
[Brief subject-wise summary of topics covered]

### 📅 Upcoming Events
[List upcoming dates, deadlines, or events]

### 💬 Message from the Teacher
[A warm, personal note to parents]

---
*Thank you for your continued support!*`
  },
  {
    id: 'attendance-report',
    title: 'Attendance Report',
    description: 'Generate formatted monthly attendance summary reports for records or PTM.',
    icon: ClipboardList,
    color: 'from-gray-500 to-slate-700',
    inputs: [
      { id: 'className', label: 'Class / Section', type: 'text', placeholder: 'e.g. Class 7-A' },
      { id: 'month', label: 'Month', type: 'select', options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
      { id: 'totalStudents', label: 'Total Students', type: 'text', placeholder: 'e.g. 45' },
      { id: 'workingDays', label: 'Working Days in Month', type: 'text', placeholder: 'e.g. 22' }
    ],
    promptTemplate: (data) => `Generate a professional monthly attendance summary report template for ${data.className}, ${data.month}. Total students: ${data.totalStudents}. Working days: ${data.workingDays}.

YOU MUST STRICTLY USE THIS FORMAT:

# Attendance Report: ${data.className}
**Month:** ${data.month} | **Working Days:** ${data.workingDays} | **Total Students:** ${data.totalStudents}

### Summary Table
| Category | Count | Percentage |
|----------|-------|------------|
| Average Present | [Calculate] | [%] |
| Average Absent | [Calculate] | [%] |
| Perfect Attendance | [Estimate] | - |
| Below 75% Attendance | [Estimate] | - |

### Observations
[2-3 sentences summarizing attendance trends]

### Action Plan for Low Attendance
[2 bullet points on how to improve attendance]

---
*Prepared by: [Class Teacher] | Date: ${new Date().toLocaleDateString()}*`
  },
  {
    id: 'homework-planner',
    title: 'Homework Planner',
    description: 'Generate structured, meaningful homework assignments with clear instructions.',
    icon: ClipboardList,
    color: 'from-orange-500 to-amber-600',
    inputs: [
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. English, Science, Hindi' },
      { id: 'topic', label: 'Topic / Chapter', type: 'text', placeholder: 'e.g. Chapter 4: Light and Shadows' },
      { id: 'grade', label: 'Class Level', type: 'select', options: ['Class 1-3', 'Class 4-6', 'Class 7-8', 'Class 9-10', 'Class 11-12'] },
      { id: 'type', label: 'Homework Type', type: 'select', options: ['Written Assignment', 'Research / Project', 'Practice Problems', 'Reading + Summary', 'Creative / Art-Based'] }
    ],
    promptTemplate: (data) => `Create a structured ${data.type} homework assignment for ${data.grade} ${data.subject} on "${data.topic}".

YOU MUST STRICTLY USE THIS FORMAT:

# Homework: ${data.subject} — ${data.topic}
**Class:** ${data.grade} | **Type:** ${data.type}
**Submission Date:** [Teacher to fill]

### Instructions
[Clear, numbered step-by-step instructions]

### Tasks
[3-5 specific tasks the student must complete]

### Evaluation Criteria
| Criteria | Marks |
|----------|-------|
| [Criteria 1] | [X] |
| [Criteria 2] | [X] |

---
> **🏠 Parent Note:** This assignment is expected to take approximately [X] minutes.`
  },
  {
    id: 'iep-generator',
    title: 'IEP Generator',
    description: 'Create Individual Education Plans for students with special learning needs.',
    icon: Heart,
    color: 'from-teal-500 to-emerald-600',
    inputs: [
      { id: 'studentName', label: 'Student Name', type: 'text', placeholder: 'e.g. Rahul' },
      { id: 'grade', label: 'Class', type: 'select', options: ['Class 1-3', 'Class 4-6', 'Class 7-8', 'Class 9-10'] },
      { id: 'need', label: 'Primary Learning Need', type: 'select', options: ['Dyslexia', 'ADHD', 'Autism Spectrum', 'Slow Learner', 'Speech/Language Delay', 'Physical Disability', 'Gifted / Twice Exceptional', 'Other'] },
      { id: 'strengths', label: 'Student Strengths', type: 'textarea', placeholder: 'e.g. Great at art, loves music, good memory...' }
    ],
    promptTemplate: (data) => `Create a detailed Individual Education Plan (IEP) for a ${data.grade} student named ${data.studentName} with ${data.need}.
Student strengths: ${data.strengths}

YOU MUST STRICTLY USE THIS FORMAT:

# Individual Education Plan (IEP)
**Student:** ${data.studentName} | **Class:** ${data.grade}
**Primary Need:** ${data.need}

### 🎯 Annual Goals
1. [Academic goal]
2. [Social/behavioral goal]
3. [Communication/life skill goal]

### 📋 Accommodations & Modifications
| Area | Accommodation |
|------|---------------|
| Seating | [Specific arrangement] |
| Instruction | [Modified teaching approach] |
| Assessment | [Testing modifications] |
| Materials | [Adapted resources] |

### 📊 Progress Monitoring
[How and when progress will be measured]

### 🤝 Support Team
[Who is responsible for what]

---
> **Review Date:** [Every 3 months] | **Parent Signature:** ___________`
  },
  {
    id: 'lab-experiment',
    title: 'Lab Experiment Writer',
    description: 'Generate structured science practical/experiment write-ups with procedures and observations.',
    icon: FlaskConical,
    color: 'from-green-500 to-teal-600',
    inputs: [
      { id: 'experiment', label: 'Experiment Name', type: 'text', placeholder: 'e.g. Testing for Starch in Leaves' },
      { id: 'subject', label: 'Science Branch', type: 'select', options: ['Physics', 'Chemistry', 'Biology', 'General Science'] },
      { id: 'grade', label: 'Class Level', type: 'select', options: ['Class 6-8', 'Class 9-10', 'Class 11-12'] }
    ],
    promptTemplate: (data) => `Write a complete ${data.subject} lab practical write-up for the experiment: "${data.experiment}" for ${data.grade} students.

YOU MUST STRICTLY USE THIS FORMAT:

# Lab Report: ${data.experiment}
**Subject:** ${data.subject} | **Class:** ${data.grade}

### 🎯 Aim
[State the aim clearly]

### 📦 Materials Required
* [Bulleted list of apparatus and chemicals]

### ⚠️ Safety Precautions
* [Important safety points]

### 📋 Procedure
1. [Step-by-step numbered instructions]
2. [...]

### 📊 Observation Table
| S.No | Observation | Inference |
|------|-------------|----------|

### 📝 Result / Conclusion
[State the conclusion clearly]

### ❓ Viva Voce Questions
1. [Possible question an examiner might ask]
2. [...]
3. [...]`
  },
  {
    id: 'book-review',
    title: 'Book Review Generator',
    description: 'Generate structured book review templates for students with guided prompts.',
    icon: BookMarked,
    color: 'from-amber-600 to-yellow-700',
    inputs: [
      { id: 'bookTitle', label: 'Book Title', type: 'text', placeholder: 'e.g. Charlotte\'s Web, The Diary of a Young Girl' },
      { id: 'author', label: 'Author', type: 'text', placeholder: 'e.g. E.B. White' },
      { id: 'grade', label: 'Student Level', type: 'select', options: ['Class 3-5 (Simple)', 'Class 6-8 (Intermediate)', 'Class 9-12 (Advanced / Critical)'] }
    ],
    promptTemplate: (data) => `Generate a detailed book review template/guide for "${data.bookTitle}" by ${data.author}, suitable for ${data.grade} students.

YOU MUST STRICTLY USE THIS FORMAT:

# 📖 Book Review: ${data.bookTitle}
**Author:** ${data.author}

### Summary
[A spoiler-free book summary in 3-5 sentences]

### Characters
| Character | Role | Key Traits |
|-----------|------|------------|

### Themes
* [Major themes explored in the book]

### My Favorite Part
[Guide prompt for the student]

### Critical Analysis
[What worked well? What could be better?]

### Rating
⭐⭐⭐⭐☆ (X/5)

### Recommendation
[Would you recommend this? Why?]`
  },
  {
    id: 'activity-based-learning',
    title: 'Activity Based Learning (CBSE)',
    description: 'Design CBSE-aligned hands-on activities using Art Integration & Experiential Learning pedagogy.',
    icon: Lightbulb,
    color: 'from-yellow-400 to-amber-500',
    inputs: [
      { id: 'topic', label: 'Topic / Chapter', type: 'text', placeholder: 'e.g. Photosynthesis, Fractions, Indian Freedom Struggle' },
      { id: 'subject', label: 'Subject', type: 'select', options: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'EVS', 'Computer Science'] },
      { id: 'grade', label: 'CBSE Class', type: 'select', options: ['Class 1-2 (Foundational)', 'Class 3-5 (Preparatory)', 'Class 6-8 (Middle Stage)', 'Class 9-10 (Secondary)', 'Class 11-12 (Senior Secondary)'] },
      { id: 'framework', label: 'CBSE Pedagogy Framework', type: 'select', options: ['Art Integrated Learning (AIL)', 'Experiential Learning', 'Competency Based Learning', 'Sports Integrated Learning', 'Storytelling / Narrative Pedagogy', 'Toy-Based / Play-Based Learning'] },
      { id: 'duration', label: 'Activity Duration', type: 'select', options: ['15 Minutes (Quick)', '30 Minutes (Standard)', '1 Full Period (45 min)', 'Multi-Day Project'] }
    ],
    promptTemplate: (data) => `Design a CBSE-aligned ${data.framework} activity for ${data.grade} ${data.subject} on the topic "${data.topic}". Duration: ${data.duration}.
This must follow CBSE/NEP 2020 guidelines for activity-based pedagogy.

YOU MUST STRICTLY USE THIS FORMAT:

# Activity Based Learning: ${data.topic}
**Subject:** ${data.subject} | **Class:** ${data.grade}
**Framework:** ${data.framework} | **Duration:** ${data.duration}

### 🎯 Learning Outcomes (CBSE-Aligned)
* [Specific CBSE learning outcome 1]
* [Specific CBSE learning outcome 2]

### 📦 Materials Required
* [List of easily available materials]

### 🏗️ Activity Design
**Step 1 - Engage (5 min):** [Hook activity to spark curiosity]
**Step 2 - Explore (10 min):** [Hands-on exploration / investigation]
**Step 3 - Explain (10 min):** [Teacher-guided concept building]
**Step 4 - Elaborate (10 min):** [Student application / extension]
**Step 5 - Evaluate (5 min):** [Quick formative assessment]

### 🎨 ${data.framework} Integration
[Explain specifically how this activity integrates the chosen pedagogy framework]

### 📊 Assessment Rubric
| Criteria | Excellent (4) | Good (3) | Developing (2) | Needs Support (1) |
|----------|--------------|----------|----------------|--------------------|
| [Criteria 1] | ... | ... | ... | ... |
| [Criteria 2] | ... | ... | ... | ... |

### 🔄 Cross-Curricular Links
[How this connects to other subjects as per NEP 2020]

---
> **📌 CBSE Reference:** This activity aligns with NEP 2020's emphasis on ${data.framework} and reduces rote learning.`
  }
]

export default function AITools() {
  const { currentUser, userProfile } = useAuth()
  const { stats, spendCoins } = useGamification()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Read ?tool= from URL
  const queryParams = new URLSearchParams(location.search)
  const toolParam = queryParams.get('tool')
  const initialTool = tools.find(t => t.id === toolParam) || tools[0]

  const [activeTool, setActiveTool] = useState(initialTool)
  
  // Dynamic form state
  const [formData, setFormData] = useState({})
  
  // Reset form when tool changes
  useEffect(() => {
    setActiveTool(tools.find(t => t.id === toolParam) || tools[0])
    setFormData({})
    setGeneratedContent('')
    setError('')
  }, [toolParam])

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [outputLanguage, setOutputLanguage] = useState('English')
  const [isListening, setIsListening] = useState(false)
  const [activeVoiceField, setActiveVoiceField] = useState(null)

  // Validate form
  const isFormValid = activeTool.inputs.every(input => formData[input.id] && formData[input.id].trim() !== '')

  async function handleGenerate(e) {
    e.preventDefault()
    if (!currentUser) return navigate('/login')
    if (!isFormValid) return

    setIsGenerating(true)
    setError('')
    setGeneratedContent('')
    setCopied(false)

    const COST = 5
    const isSuperAdmin = userProfile?.role === 'superadmin'

    if (!isSuperAdmin) {
      if ((stats?.coins || 0) < COST) {
        setError(`Not enough coins! You need ${COST} coins to generate. Earn free coins by logging in daily or sharing resources on the Feed! 🪙`)
        setIsGenerating(false)
        return
      }
      
      const success = await spendCoins(COST, 'AI Generation')
      if (!success) {
        setError('Transaction failed. Please try again.')
        setIsGenerating(false)
        return
      }
    }

    try {
      let langInstruction = ''
      if (outputLanguage !== 'English') {
        langInstruction = `\n\nIMPORTANT: Generate ALL output in ${outputLanguage} language. Use ${outputLanguage} script/text throughout.`
      }
      const prompt = activeTool.promptTemplate(formData) + langInstruction
      const result = await generateAIContent(prompt)
      setGeneratedContent(result)

      // Save to Firebase generation history
      if (currentUser) {
        try {
          await addDoc(collection(db, 'users', currentUser.uid, 'generations'), {
            toolId: activeTool.id,
            toolTitle: activeTool.title,
            toolColor: activeTool.color,
            content: result,
            formData: formData,
            language: outputLanguage,
            createdAt: serverTimestamp()
          })
        } catch (saveErr) {
          console.warn('Could not save generation history:', saveErr)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Keyboard shortcut: Ctrl+Enter to generate
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        const formEl = document.querySelector('form')
        if (formEl) formEl.requestSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleCopy() {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleDownloadPDF() {
    const printContent = document.getElementById('printable-area')
    if (!printContent || isDownloading) return

    setIsDownloading(true)

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ])

      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '794px'
      container.style.background = '#ffffff'
      container.style.padding = '40px'
      container.style.zIndex = '-9999'

      container.innerHTML = `
        <style>
          .pdf-wrapper { font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.7; }
          .pdf-content h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin: 24px 0 14px 0; padding-bottom: 8px; border-bottom: 3px solid #e2e8f0; }
          .pdf-content h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #f1f5f9; }
          .pdf-content h3 { font-size: 15px; font-weight: 700; color: #334155; margin: 16px 0 8px 0; }
          .pdf-content p { font-size: 13px; color: #475569; margin-bottom: 12px; line-height: 1.7; }
          .pdf-content strong { color: #0f172a; font-weight: 700; }
          .pdf-content em { font-style: italic; color: #64748b; }
          .pdf-content ul, .pdf-content ol { margin: 10px 0 14px 0; padding-left: 24px; }
          .pdf-content li { font-size: 13px; color: #475569; margin-bottom: 6px; line-height: 1.6; }
          .pdf-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; border: 1px solid #e2e8f0; }
          .pdf-content th { background: #f1f5f9; font-weight: 700; color: #1e293b; padding: 10px 12px; text-align: left; border: 1px solid #e2e8f0; }
          .pdf-content td { padding: 8px 12px; color: #475569; border: 1px solid #e2e8f0; }
          .pdf-content tr:nth-child(even) { background-color: #fafbfc; }
          .pdf-content blockquote { border-left: 4px solid #6366f1; background: #eef2ff; padding: 14px 18px; margin: 16px 0; border-radius: 0 8px 8px 0; }
        </style>
        <div class="pdf-wrapper">
          <div class="pdf-content">${printContent.innerHTML}</div>
        </div>
      `

      document.body.appendChild(container)
      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
      document.body.removeChild(container)

      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`LDMS_${activeTool.title.replace(/\s+/g, '_')}.pdf`)

    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  // Handle dynamic form input changes
  const handleInputChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  // Voice Input via Web Speech API
  function startVoiceInput(fieldId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    
    setIsListening(true)
    setActiveVoiceField(fieldId)
    recognition.start()

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setFormData(prev => ({ ...prev, [fieldId]: (prev[fieldId] || '') + ' ' + transcript }))
      setIsListening(false)
      setActiveVoiceField(null)
    }
    recognition.onerror = () => { setIsListening(false); setActiveVoiceField(null) }
    recognition.onend = () => { setIsListening(false); setActiveVoiceField(null) }
  }

  // Share handlers
  function handleShareWhatsApp() {
    const text = encodeURIComponent(`*${activeTool.title}*\n\n${generatedContent}\n\n_Generated via LDMS Teacher Hub_`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    setShowShareMenu(false)
  }

  function handleShareTelegram() {
    const text = encodeURIComponent(`${activeTool.title}\n\n${generatedContent}\n\nGenerated via LDMS Teacher Hub`)
    window.open(`https://t.me/share/url?text=${text}`, '_blank')
    setShowShareMenu(false)
  }

  function handleShareEmail() {
    const subject = encodeURIComponent(`${activeTool.title} - Generated Content`)
    const body = encodeURIComponent(`${generatedContent}\n\n---\nGenerated via LDMS Teacher Hub`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
    setShowShareMenu(false)
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeTool.title,
          text: generatedContent
        })
      } catch (err) { /* user cancelled */ }
    }
    setShowShareMenu(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in-up pb-20 sm:pb-0">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-slate-900 border border-slate-800 p-5 sm:p-8 lg:p-12 shadow-2xl">
        <div className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-gradient-to-tr ${activeTool.color} rounded-full blur-[120px] pointer-events-none opacity-20`} />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-semibold tracking-wide backdrop-blur-md mb-4 sm:mb-6">
            <activeTool.icon className="w-4 h-4" /> AI Workspace
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight leading-tight mb-3 sm:mb-4">
            {activeTool.title}
          </h1>
          <p className="text-sm sm:text-lg text-surface-300 font-medium leading-relaxed">
            {activeTool.description}
          </p>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto mt-8">
        {/* Full-width Standalone Tool Workspace */}
        <div className="flex flex-col">
          <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-surface-200 border-none flex-1 overflow-hidden flex flex-col">
            
            <div className="p-6 md:p-8 border-b border-surface-100/80 bg-surface-50/50">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${activeTool.color} text-white shadow-md`}>
                  <activeTool.icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display tracking-tight text-surface-900">{activeTool.title} Workspace</h2>
                  <p className="text-sm font-medium text-surface-500">Configure parameters below</p>
                </div>
              </div>

              {/* DYNAMIC FORM RENDERING */}
              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Language Selector */}
                <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <Globe className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-widest whitespace-nowrap">Output Language</label>
                  <select
                    value={outputLanguage}
                    onChange={e => setOutputLanguage(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-surface-800 focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none"
                  >
                    {['English', 'Hindi', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'].map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {activeTool.inputs.map((input) => (
                    <div key={input.id} className={`space-y-2 ${input.type === 'textarea' ? 'col-span-1 md:col-span-2' : ''}`}>
                      <label className="text-xs font-bold uppercase tracking-widest text-surface-500 px-1">{input.label}</label>
                      
                      {input.type === 'select' ? (
                        <select
                          value={formData[input.id] || ''}
                          onChange={e => handleInputChange(input.id, e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-[3px] focus:ring-primary-100 focus:border-primary-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] appearance-none"
                          required
                        >
                          <option value="" disabled>Select {input.label}...</option>
                          {input.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : input.type === 'textarea' ? (
                        <div className="relative">
                          <textarea
                            placeholder={input.placeholder}
                            value={formData[input.id] || ''}
                            onChange={e => handleInputChange(input.id, e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 pr-12 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-[3px] focus:ring-primary-100 focus:border-primary-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] resize-y"
                            required
                          />
                          <button type="button" onClick={() => startVoiceInput(input.id)} className={`absolute right-3 top-3 p-1.5 rounded-lg transition-all ${isListening && activeVoiceField === input.id ? 'bg-red-100 text-red-600 animate-pulse' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'}`} title="Voice Input">
                            {isListening && activeVoiceField === input.id ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type={input.type}
                            placeholder={input.placeholder}
                            value={formData[input.id] || ''}
                            onChange={e => handleInputChange(input.id, e.target.value)}
                            className="w-full px-4 py-3 pr-12 bg-white border border-surface-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-[3px] focus:ring-primary-100 focus:border-primary-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                            required
                          />
                          <button type="button" onClick={() => startVoiceInput(input.id)} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening && activeVoiceField === input.id ? 'bg-red-100 text-red-600 animate-pulse' : 'text-surface-400 hover:text-surface-700 hover:bg-surface-100'}`} title="Voice Input">
                            {isListening && activeVoiceField === input.id ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isGenerating || !isFormValid}
                    className="w-full relative overflow-hidden px-6 py-3.5 bg-gradient-to-b from-surface-900 to-black text-white font-semibold text-sm tracking-wide rounded-xl
                    hover:scale-[1.01] transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)]
                    active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group flex justify-center items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating Masterpiece...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 group-hover:text-accent-400 transition-colors" />
                        <span>Generate Content</span>
                        {userProfile?.role === 'superadmin' ? (
                          <span className="ml-1.5 px-2 py-0.5 bg-white/20 rounded-lg text-[10px] font-bold tracking-widest text-amber-200 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3"/> Free</span>
                        ) : (
                          <span className="ml-1.5 px-2 py-0.5 bg-black/20 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <span className="text-[10px]">🪙</span> 5
                          </span>
                        )}
                        <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold tracking-wider opacity-80 border border-white/10">Ctrl+Enter</kbd>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium flex items-start gap-3 animate-fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Output Area */}
            {generatedContent && (
              <div className="flex-1 flex flex-col overflow-hidden bg-white animate-fade-in-up">
                <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50/50">
                  <span className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-2">Generated Output</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleGenerate({ preventDefault: () => {} })}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-200/50 rounded-lg transition-colors active:scale-95 border border-transparent"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                        copied 
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' 
                          : 'bg-primary-50 text-primary-700 hover:bg-primary-100 ring-1 ring-primary-500/20'
                      }`}
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-sm ${
                        isDownloading 
                          ? 'bg-surface-400 text-white cursor-wait' 
                          : 'bg-surface-900 text-white hover:bg-black'
                      }`}
                    >
                      {isDownloading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating PDF...</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> Export PDF</>
                      )}
                    </button>
                    {/* Share Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 bg-green-600 text-white hover:bg-green-700 shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                      {showShareMenu && (
                        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl ring-1 ring-surface-200 p-2 z-50 min-w-[200px] animate-fade-in">
                          <button onClick={handleShareWhatsApp} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-surface-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors">
                            <MessageCircle className="w-5 h-5 text-green-600" /> WhatsApp
                          </button>
                          <button onClick={handleShareTelegram} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-surface-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
                            <Send className="w-5 h-5 text-blue-500" /> Telegram
                          </button>
                          <button onClick={handleShareEmail} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-surface-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors">
                            <Mail className="w-5 h-5 text-amber-600" /> Email
                          </button>
                          {navigator.share && (
                            <button onClick={handleNativeShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-surface-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors border-t border-surface-100 mt-1 pt-3">
                              <Share2 className="w-5 h-5 text-purple-600" /> More Options...
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 max-h-[500px] sm:max-h-[600px] bg-white">
                  <article id="printable-area" className="prose prose-slate prose-sm md:prose-base max-w-none 
                    prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-surface-900
                    prose-p:text-surface-600 prose-p:leading-relaxed prose-li:text-surface-600 
                    prose-strong:text-surface-900 prose-strong:font-bold
                    prose-a:text-primary-600 hover:prose-a:text-primary-700
                    prose-hr:border-surface-200
                    prose-table:w-full prose-table:border-collapse prose-table:my-6
                    prose-th:bg-surface-100 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-bold prose-th:text-surface-900 prose-th:border prose-th:border-surface-200
                    prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-surface-200 prose-td:text-surface-700
                    prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:bg-primary-50 prose-blockquote:px-5 prose-blockquote:py-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:shadow-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {generatedContent}
                    </ReactMarkdown>
                  </article>
                </div>
              </div>
            )}
            
            {!generatedContent && !isGenerating && (
              <div className="flex-1 p-12 flex flex-col items-center justify-center text-center bg-surface-50 border-t border-surface-100 text-surface-400 min-h-[300px]">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 ring-1 ring-surface-200 rotate-3">
                  <Send className="w-6 h-6 text-surface-300" />
                </div>
                <h3 className="text-lg font-bold text-surface-700 tracking-tight font-display mb-1">Ready to generate</h3>
                <p className="text-sm font-medium max-w-[280px]">Fill out the precise parameters above to create your specific content.</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="flex-1 p-12 flex flex-col items-center justify-center text-center bg-surface-50 border-t border-surface-100 min-h-[300px]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-accent-400 rounded-full blur-[20px] opacity-30 animate-pulse" />
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm relative ring-1 ring-surface-200">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-surface-800 tracking-tight font-display mb-1 animate-pulse">Running {activeTool.title}...</h3>
                <p className="text-sm text-surface-500 font-medium">Generating your customized request now.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
