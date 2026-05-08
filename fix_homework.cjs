const fs = require('fs');
const path = './src/pages/AITools.jsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `  {
    id: 'daily-homework',
    title: 'Daily Classroom Homework',
    description: 'Generate focused, engaging daily assignments for students to complete at home.',
    icon: ClipboardList,
    color: 'from-orange-500 to-amber-600',
    inputs: [
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. English, Science, Math' },
      { id: 'topic', label: 'Topic Taught Today', type: 'text', placeholder: 'e.g. Addition of 2-digit numbers' },
      { id: 'grade', label: 'Class / Grade', type: 'select', options: GRADE_LIST },
      { id: 'type', label: 'Homework Format', type: 'select', options: ['Quick Revision & Practice', 'Reading & Reflection', 'Short Writing Task', 'Math Problems (5-10 Qs)'] }
    ],
    promptTemplate: (data) => \`Create a \${data.type} daily homework assignment for \${data.grade} \${data.subject} based on today's topic: "\${data.topic}".

YOU MUST STRICTLY USE THIS FORMAT:

# Daily Homework: \${data.subject}
**Class:** \${data.grade} | **Topic:** \${data.topic}
**Date Assigned:** \${new Date().toLocaleDateString()} | **Due Date:** [Next Day]

### 📝 Instructions for Students
[Clear, engaging 2-3 sentence instruction]

### ✅ Tasks to Complete
1. [Specific, actionable task 1]
2. [Specific, actionable task 2]
3. [Optional extra practice]

---
> **🏠 Note to Parents:** This homework is designed to take [15-20] minutes. Focus: [Main skill being practiced].\`
  },
  {
    id: 'holiday-homework',
    title: 'Holiday Homework & Projects',
    description: 'Design creative, comprehensive holiday homework, vacation projects, and activities.',
    icon: Calendar,
    color: 'from-purple-500 to-fuchsia-600',
    inputs: [
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. All Subjects, Science, EVS' },
      { id: 'theme', label: 'Holiday Theme / Vacation', type: 'text', placeholder: 'e.g. Summer Vacation, Diwali Break, Winter Holidays' },
      { id: 'grade', label: 'Class / Grade', type: 'select', options: GRADE_LIST },
      { id: 'duration', label: 'Vacation Duration', type: 'select', options: ['1 Week Break', '15 Days Break', '1 Month Summer/Winter Vacation'] }
    ],
    promptTemplate: (data) => \`Create an engaging, multi-part \${data.theme} holiday homework project for \${data.grade} \${data.subject}. The vacation duration is \${data.duration}.

YOU MUST STRICTLY USE THIS FORMAT:

# 🏖️ \${data.theme} Holiday Homework
**Class:** \${data.grade} | **Subject:** \${data.subject}

### 🌟 Introduction
[An enthusiastic, encouraging opening message for the students regarding their holidays and this project.]

### 📋 Project Overview: [Creative Title]
[Briefly explain the core theme of the homework.]

### 🛠️ Required Activities
1. **Activity 1: [Name]** - [Detailed instruction and what to submit]
2. **Activity 2: [Name]** - [Detailed instruction and what to submit]
3. **Activity 3: [Name]** - [Detailed instruction and what to submit]

### 📅 Suggested Timeline
| Week / Days | Focus Area | Goal |
|-------------|------------|------|
| [Week 1]    | [Setup/Research] | [Specific goal] |

### 📊 Evaluation Rubric
| Criteria | Marks | Description |
|----------|-------|-------------|
| Creativity | [X] | [Expectation] |
| Completion | [X] | [Expectation] |

---
> **🏠 Dear Parents:** Kindly encourage your child to complete this over the \${data.duration} rather than in one day. Ensure they enjoy the process!\`
  }`;

const startIdx = content.indexOf("id: 'homework-planner'") - 6; 
const endIdx = content.indexOf("id: 'iep-generator'") - 6;

if (startIdx !== -7 && endIdx !== -7) {
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync(path, content);
  console.log('Replaced homework planner successfully!');
} else {
  console.log('Could not find bounds: ', startIdx, endIdx);
}
