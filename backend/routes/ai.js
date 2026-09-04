const express = require('express');
const router = express.Router();
const https = require('https');
const AISettings = require('../models/AISettings');
const AIChatLog = require('../models/AIChatLog');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Diary = require('../models/Diary');
const Assignment = require('../models/Assignment');
const ClassTest = require('../models/ClassTest');
const ExamResult = require('../models/ExamResult');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Helper to call Google Gemini API via HTTPS
const callGemini = (apiKey, model, systemInstruction, contents) => {
  return new Promise((resolve, reject) => {
    const payload = {
      contents: contents
    };
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Default parameters for educational reasoning & diagram synthesis
    payload.generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2500
    };

    const cleanModel = (model || 'gemini-3.5-flash').trim().replace(/^models\//, '');
    const dataString = JSON.stringify(payload);
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const candidate = parsed.candidates && parsed.candidates[0];
            const text = candidate?.content?.parts?.map(p => p.text).join('') || '';
            resolve(text);
          } else {
            const errMsg = parsed.error?.message || `Gemini API Error: Status ${res.statusCode}`;
            reject(new Error(errMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(dataString);
    req.end();
  });
};

// Helper to fetch live available models from Google Gemini API
const fetchGeminiModels = (apiKey) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models?key=${apiKey}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed.models) {
            const models = parsed.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => ({
                id: m.name.replace(/^models\//, ''),
                name: m.displayName || m.name.replace(/^models\//, ''),
                description: m.description || '',
                inputTokenLimit: m.inputTokenLimit,
                outputTokenLimit: m.outputTokenLimit
              }));
            resolve(models);
          } else {
            const errMsg = parsed.error?.message || `Failed to fetch models (Status: ${res.statusCode})`;
            reject(new Error(errMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse models list: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
};

// @route   GET api/ai/config
// @desc    Get public AI configuration (enabled status, curriculum, etc.)
router.get('/config', auth, async (req, res) => {
  try {
    let settings = await AISettings.findOne();
    if (!settings) {
      settings = new AISettings({});
      await settings.save();
    }
    res.json({
      isStudentAIEnabled: settings.isStudentAIEnabled,
      isTeacherAIEnabled: settings.isTeacherAIEnabled,
      curriculum: settings.curriculum,
      region: settings.region,
      modelName: settings.modelName || 'gemini-3.5-flash',
      languagePreference: settings.languagePreference,
      hasApiKey: Boolean(settings.geminiApiKey && settings.geminiApiKey.trim().length > 5)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error loading AI config' });
  }
});

// @route   GET api/ai/admin-settings
// @desc    Get full AI settings for Principal / Admin
router.get('/admin-settings', [auth, roleCheck('admin')], async (req, res) => {
  try {
    let settings = await AISettings.findOne();
    if (!settings) {
      settings = new AISettings({});
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error loading admin AI settings' });
  }
});

// @route   POST api/ai/admin-settings
// @desc    Update AI settings for Principal / Admin
router.post('/admin-settings', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const {
      geminiApiKey,
      modelName,
      region,
      curriculum,
      languagePreference,
      studentSystemPrompt,
      teacherSystemPrompt,
      isStudentAIEnabled,
      isTeacherAIEnabled
    } = req.body;

    let settings = await AISettings.findOne();
    if (!settings) {
      settings = new AISettings({});
    }

    if (geminiApiKey !== undefined) settings.geminiApiKey = geminiApiKey.trim();
    if (modelName !== undefined) settings.modelName = modelName;
    if (!settings.modelName) settings.modelName = 'gemini-3.5-flash';
    if (region !== undefined) settings.region = region;
    if (curriculum !== undefined) settings.curriculum = curriculum;
    if (languagePreference !== undefined) settings.languagePreference = languagePreference;
    if (studentSystemPrompt !== undefined) settings.studentSystemPrompt = studentSystemPrompt;
    if (teacherSystemPrompt !== undefined) settings.teacherSystemPrompt = teacherSystemPrompt;
    if (isStudentAIEnabled !== undefined) settings.isStudentAIEnabled = isStudentAIEnabled;
    if (isTeacherAIEnabled !== undefined) settings.isTeacherAIEnabled = isTeacherAIEnabled;

    await settings.save();
    res.json({ msg: 'AI Settings updated successfully', settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error updating AI settings' });
  }
});

// @route   POST api/ai/test-connection
// @desc    Test Google Gemini API Key
router.post('/test-connection', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { apiKey, modelName } = req.body;
    const testKey = apiKey ? apiKey.trim() : null;
    let keyToUse = testKey;

    if (!keyToUse) {
      const settings = await AISettings.findOne();
      keyToUse = settings?.geminiApiKey;
    }

    if (!keyToUse) {
      return res.status(400).json({ msg: 'No Gemini API Key provided to test.' });
    }

    const testPrompt = [{ role: 'user', parts: [{ text: 'Respond with a single word: "Connected" if you can read this.' }] }];
    const response = await callGemini(keyToUse, modelName || 'gemini-3.5-flash', 'You are a test agent.', testPrompt);

    res.json({
      success: true,
      msg: 'Gemini API Connected Successfully!',
      sampleResponse: response.trim()
    });
  } catch (err) {
    console.error('Gemini Test Connection Failed:', err.message);
    res.status(400).json({
      success: false,
      msg: `API Connection Failed: ${err.message}`
    });
  }
});

// @route   POST api/ai/models
// @desc    Fetch live available models from Google for this API Key
router.post('/models', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { apiKey } = req.body;
    let keyToUse = apiKey ? apiKey.trim() : null;

    if (!keyToUse) {
      const settings = await AISettings.findOne();
      keyToUse = settings?.geminiApiKey;
    }

    if (!keyToUse) {
      return res.status(400).json({ msg: 'No Gemini API Key found. Please enter or save your API key first.' });
    }

    const models = await fetchGeminiModels(keyToUse);
    res.json({
      success: true,
      models
    });
  } catch (err) {
    console.error('Failed to fetch Gemini models:', err.message);
    res.status(400).json({
      success: false,
      msg: `Failed to fetch models: ${err.message}`
    });
  }
});

// @route   POST api/ai/student/chat
// @desc    Personalized Student AI Tutor Chat with Context & Diagram Generation
router.post('/student/chat', auth, async (req, res) => {
  try {
    const { message, history = [], chatId = null } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ msg: 'Message text is required' });
    }

    // 1. Fetch AI settings
    const settings = await AISettings.findOne();
    if (!settings || !settings.geminiApiKey) {
      return res.status(400).json({ msg: 'AI Chat is currently not configured by the school administration (API Key missing).' });
    }
    if (!settings.isStudentAIEnabled) {
      return res.status(403).json({ msg: 'AI Student Tutor is currently disabled by the school administration.' });
    }

    // 2. Identify Student Profile
    let studentId = req.user.studentProfile;
    // Allow parents with studentProfiles array or passed studentId
    if (!studentId && req.body.studentId) {
      studentId = req.body.studentId;
    }

    let student = null;
    let recentDiary = [];
    let recentAssignments = [];
    let testPerformanceSummary = 'No recent test data available.';
    let weakSubjects = [];

    if (studentId) {
      student = await Student.findById(studentId).populate('class', 'name').populate('section', 'name');

      if (student) {
        // Today & recent 3 days diary
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        recentDiary = await Diary.find({
          class: student.class?._id,
          section: student.section?._id,
          date: { $gte: threeDaysAgo }
        }).sort({ date: -1 }).limit(6);

        // Recent assignments
        recentAssignments = await Assignment.find({
          class: student.class?._id,
          section: student.section?._id
        }).sort({ createdAt: -1 }).limit(5);

        // Recent Class Tests & Performance
        const classTests = await ClassTest.find({
          class: student.class?._id,
          section: student.section?._id,
          'results.student': student._id
        }).sort({ date: -1 }).limit(10);

        if (classTests.length > 0) {
          const subjectScores = {};
          classTests.forEach(test => {
            const studentResult = test.results.find(r => r.student.toString() === student._id.toString());
            if (studentResult) {
              if (!subjectScores[test.subject]) subjectScores[test.subject] = { obtained: 0, total: 0 };
              subjectScores[test.subject].obtained += studentResult.obtainedMarks;
              subjectScores[test.subject].total += test.totalMarks;
            }
          });

          const perfItems = [];
          Object.keys(subjectScores).forEach(sub => {
            const item = subjectScores[sub];
            const pct = item.total > 0 ? Math.round((item.obtained / item.total) * 100) : 0;
            perfItems.push(`${sub}: ${pct}%`);
            if (pct < 55) weakSubjects.push(sub);
          });
          testPerformanceSummary = `Recent Test Scores: [${perfItems.join(', ')}]. ${weakSubjects.length > 0 ? `Identified Weak Subjects needing extra guidance: ${weakSubjects.join(', ')}` : 'Academic Performance is good.'}`;
        }
      }
    }

    // 3. Assemble Personalized System Prompt
    const studentContextPrompt = `
You are the personal AI Tutor & Learning Guide for a student in this school.
Student Details:
- Name: ${student ? student.name : 'Student'}
- Grade / Class: ${student?.class?.name || 'Class 5'}
- Section: ${student?.section?.name || 'General'}
- Region / School System: ${settings.region || 'Pakistan'}
- Curriculum / Textbooks: ${settings.curriculum || 'Oxford / National Curriculum'}
- Language Preference: ${settings.languagePreference || 'Bilingual / Roman Urdu Friendly'}
- Academic Performance Context: ${testPerformanceSummary}
- Today's / Recent Diary & Homework: ${recentDiary.length > 0 ? recentDiary.map(d => `${d.subject}: ${d.homework} (Date: ${d.date?.toISOString().slice(0, 10)})`).join(' | ') : 'None posted yet'}
- Active Class Assignments: ${recentAssignments.length > 0 ? recentAssignments.map(a => `${a.subject}: "${a.title}" - ${a.content}`).join(' | ') : 'None'}

RULES FOR YOUR RESPONSES:
1. Speak in a friendly, enthusiastic, highly pedagogical tone tailored to ${student?.class?.name || 'this grade level'}. Use structured markdown with headings (#, ##), bullet points, and bold text for key terms.
2. If the concept involves science, math, history, systems, or processes:
   - ALWAYS PROVIDE A PRACTICAL, EDUCATIONAL MERMAID DIAGRAM — not just a boring flowchart.
   - DIAGRAM RULES (CRITICAL — follow EXACTLY):
     * Use \`\`\`mermaid flowchart TD ... \`\`\` (top-down) or \`\`\`mermaid flowchart LR ... \`\`\` (left-right).
     * Use **subgraph** to group related steps/categories (e.g. "Sun's Energy", "In the Sky", "On Ground").
     * Use **different shapes** for different types of nodes:
       - Rectangle \`["text"]\` for facts/info
       - Stadium \`(["text"])\` for processes/actions
       - Circle \`(("text"))\` for key results/concepts
       - Rhombus \`{"text"}\` for questions/decisions
     * Always wrap labels in double quotes inside shape brackets.
     * Keep each label SHORT (max 6 words) + 1 emoji at end.
     * Use **classDef** to assign meaningful colors to each concept group:
       - classDef heat fill:#ef4444,stroke:#b91c1c,color:#fff
       - classDef water fill:#3b82f6,stroke:#1d4ed8,color:#fff
       - classDef plant fill:#16a34a,stroke:#166534,color:#fff
       - classDef sun fill:#f59e0b,stroke:#b45309,color:#fff
       - classDef result fill:#8b5cf6,stroke:#6d28d9,color:#fff
       - classDef earth fill:#06b6d4,stroke:#0e7490,color:#fff
       - classDef energy fill:#ec4899,stroke:#be185d,color:#fff
     * Then apply: \`class A,B heat\` etc.
     * Arrow labels: short, 1-3 words only.
     * For CYCLIC processes (water cycle, rock cycle), connect last node back to first node.
     * Use 5-8 nodes for a rich but clear diagram.
     * EXAMPLE — Water Cycle:
\`\`\`mermaid
flowchart TD
  subgraph SUN["☀️ Energy Source"]
    A["Sun heats water 🌞"]
  end
  subgraph SKY["☁️ In the Sky"]
    B(["Evaporation — Bhaap banti hai 💨"])
    C(["Condensation — Badal bantay hain ☁️"])
  end
  subgraph GROUND["🌍 On the Ground"]
    D(["Rain — Baarish hoti hai 🌧️"])
    E(("Collection — Nadi mein jata hai 🌊"))
  end
  A -->|Heats| B
  B -->|Upar jata hai| C
  C -->|Thanda hota hai| D
  D -->|Neeche behta hai| E
  E -->|Dobara garam| A
  classDef sun fill:#f59e0b,stroke:#b45309,color:#fff
  classDef sky fill:#3b82f6,stroke:#1d4ed8,color:#fff
  classDef ground fill:#16a34a,stroke:#166534,color:#fff
  class A sun
  class B,C sky
  class D,E ground
\`\`\`
   - AFTER the diagram, explain each step with numbered points so the child understands what is happening in the diagram.
3. If the student asks about their homework or assignment (e.g. gravity, math problem), directly connect your explanation to their class assignments and syllabus!
4. If the student seems weak or confused, encourage them and explain with everyday analogies (e.g., throwing a cricket ball for gravity).
5. At the end of major explanations, add a small 1-question "Quick Check" quiz with options A), B), C) to test if they understood.
`;

    // 4. Format contents for Gemini
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-10).forEach(h => {
        if (h.role && h.content) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
          });
        }
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // 5. Call Gemini
    const assistantReply = await callGemini(
      settings.geminiApiKey,
      settings.modelName || 'gemini-3.5-flash',
      `${settings.studentSystemPrompt}\n\n${studentContextPrompt}`,
      contents
    );

    const hasMermaid = assistantReply.includes('```mermaid');

    // 6. Log Chat & Extract Interests in Background / Session
    let chatLog = null;
    if (chatId) {
      chatLog = await AIChatLog.findById(chatId);
    }

    if (!chatLog) {
      // Determine topic
      const words = message.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
      const topTopic = words.slice(0, 3).join(' ') || 'General Learning';

      chatLog = new AIChatLog({
        user: req.user.id,
        student: student?._id,
        role: req.user.role || 'student',
        sessionTitle: topTopic,
        subject: weakSubjects[0] || 'General',
        messages: [],
        extractedTopics: words.slice(0, 5)
      });
    }

    chatLog.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    chatLog.messages.push({
      role: 'assistant',
      content: assistantReply,
      hasDiagram: hasMermaid,
      diagramType: hasMermaid ? 'Mermaid' : '',
      timestamp: new Date()
    });

    // Update topic tags
    const currentWords = message.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    currentWords.forEach(w => {
      if (!chatLog.interestTags.includes(w) && chatLog.interestTags.length < 15) {
        chatLog.interestTags.push(w);
      }
    });

    await chatLog.save();

    res.json({
      reply: assistantReply,
      chatId: chatLog._id,
      hasDiagram: hasMermaid,
      studentContext: {
        name: student?.name,
        className: student?.class?.name,
        sectionName: student?.section?.name
      }
    });

  } catch (err) {
    console.error('Student AI Chat Error:', err);
    res.status(500).json({ msg: err.message || 'Error communicating with AI Companion' });
  }
});

// @route   GET api/ai/student/history/:studentId
// @desc    Get student conversation history
router.get('/student/history/:studentId', auth, async (req, res) => {
  try {
    const logs = await AIChatLog.find({ student: req.params.studentId })
      .sort({ updatedAt: -1 })
      .limit(10);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error loading chat history' });
  }
});

// @route   GET api/ai/student/insights/:studentId
// @desc    Get aggregated AI Learning Insights for Principal / Teacher Student Profile
router.get('/student/insights/:studentId', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).populate('class', 'name').populate('section', 'name');
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    const logs = await AIChatLog.find({ student: student._id }).sort({ createdAt: -1 });

    const totalQuestions = logs.reduce((acc, log) => acc + log.messages.filter(m => m.role === 'user').length, 0);
    const diagramViews = logs.reduce((acc, log) => acc + log.messages.filter(m => m.hasDiagram).length, 0);

    // Aggregate interest tags
    const tagCount = {};
    logs.forEach(log => {
      (log.interestTags || []).forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
      (log.extractedTopics || []).forEach(t => {
        tagCount[t.toLowerCase()] = (tagCount[t.toLowerCase()] || 0) + 2;
      });
    });

    const topInterests = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);

    // Construct summary
    const recentQueries = [];
    logs.slice(0, 5).forEach(log => {
      const firstUserMsg = log.messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        recentQueries.push({
          topic: log.sessionTitle,
          query: firstUserMsg.content,
          date: log.createdAt
        });
      }
    });

    res.json({
      studentName: student.name,
      className: student.class?.name,
      sectionName: student.section?.name,
      totalSessions: logs.length,
      totalQuestions,
      diagramViews,
      topInterests,
      recentQueries,
      hasChattedWithAI: logs.length > 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error loading student AI insights' });
  }
});

// @route   POST api/ai/teacher/generate
// @desc    Teacher AI productivity workstation (Lesson Plan, Quiz Maker, Remarks, Diagram)
router.post('/teacher/generate', [auth, roleCheck('teacher', 'admin')], async (req, res) => {
  try {
    const { toolType, payload } = req.body;

    const settings = await AISettings.findOne();
    if (!settings || !settings.geminiApiKey) {
      return res.status(400).json({ msg: 'AI features are not configured with a valid Gemini API Key.' });
    }
    if (!settings.isTeacherAIEnabled) {
      return res.status(403).json({ msg: 'Teacher AI tools are currently disabled by the school administration.' });
    }

    let prompt = '';
    const curriculum = settings.curriculum || 'National / Oxford Curriculum';
    const region = settings.region || 'Pakistan';

    if (toolType === 'lesson-plan') {
      const { className, subject, topic, duration = '40 mins', learningObjectives } = payload;
      prompt = `
Create a comprehensive, highly practical, and visually rich Lesson Plan for an educator.
Context:
- Class / Grade: ${className}
- Subject: ${subject}
- Topic: ${topic}
- Duration: ${duration}
- Curriculum: ${curriculum} (${region})
- Key Objectives: ${learningObjectives || 'Standard grade-level mastery'}

Format the lesson plan clearly with markdown sections:
## 1. 🎯 Learning Objectives
- Knowledge (Cognitive understanding)
- Skills & Practical Application

## 2. 🧰 Required Materials & Blackboard Layout
- List of physical items/props
- Key vocabulary terms to write on the board

## 3. ⏱️ Step-by-Step Timing Breakdown
- I. Hook & Introduction (05 Mins)
- II. Direct Instruction & Concept Delivery (15 Mins)
- III. Guided Classroom Activity & Demonstration (10 Mins)
- IV. Independent Student Exercise (05 Mins)
- V. Lesson Wrap-Up & Exit Ticket (05 Mins)

## 4. 📊 Blackboard Concept Flowchart & Visual Diagram
CRITICAL: You MUST provide an ACTUAL, RENDERABLE Mermaid flowchart. NO placeholders.
DIAGRAM RULES:
- Use \`flowchart TD\` (top-down) or \`flowchart LR\` (left-right).
- Use **subgraph** to group related stages (e.g. "Input", "Process", "Output").
- Use different shapes: \`["text"]\` for facts, \`(["text"])\` for processes, \`(("text"))\` for results, \`{"text"}\` for decisions.
- Keep each label SHORT (max 6 words) + 1 emoji.
- Use **classDef** for meaningful colors per concept group:
  \`classDef input fill:#3b82f6,stroke:#1d4ed8,color:#fff\`
  Then apply: \`class A,B input\`
- 5-8 nodes for a rich but clear diagram.
Example:
\`\`\`mermaid
flowchart TD
  subgraph INPUT["📥 Input"]
    A["Key Question 🎯"]
  end
  subgraph PROCESS["⚙️ Process"]
    B(["First Action ⚡"])
    C(["Core Principle 🌍"])
  end
  subgraph OUTPUT["📤 Result"]
    D(("Conclusion 💡"))
  end
  A -->|Step 1| B
  B -->|Step 2| C
  C -->|Result| D
  classDef inp fill:#3b82f6,stroke:#1d4ed8,color:#fff
  classDef proc fill:#059669,stroke:#047857,color:#fff
  classDef out fill:#8b5cf6,stroke:#6d28d9,color:#fff
  class A inp
  class B,C proc
  class D out
\`\`\`

## 5. 📝 Assessment Questions (Check for Understanding)
- 3 Quick questions for students to answer in class.

## 6. 🏠 Homework Assignment
- Standard Task & Creative Challenge Task
`;
    } else if (toolType === 'quiz-maker') {
      const { className, subject, topic, numQuestions = 5, questionTypes = 'MCQs & Short Questions', difficulty = 'Medium' } = payload;
      prompt = `
Generate a ready-to-print Classroom Quiz / Test Paper for:
- Grade: ${className}
- Subject: ${subject}
- Chapter/Topic: ${topic}
- Curriculum: ${curriculum}
- Number of Questions: ${numQuestions}
- Question Types: ${questionTypes}
- Difficulty Level: ${difficulty}

Include:
- Section A: Multiple Choice Questions (with 4 distinct options A, B, C, D)
- Section B: Short Conceptual Questions
- Complete Marking Key & Detailed Solutions at the end for teacher grading
`;
    } else if (toolType === 'diagram-generator') {
      const { topic, subject, diagramGoal } = payload;
      prompt = `
Create an educational visual diagram and concept flowchart for the subject "${subject}" on the topic "${topic}".
Goal: ${diagramGoal || 'Clear conceptual hierarchy and workflow'}.
Output MUST include a valid Mermaid flowchart (\`\`\`mermaid flowchart TD ... \`\`\`) suitable for classroom blackboard display, followed by a concise teaching note.
DIAGRAM RULES:
- Use subgraphs to group related stages. Use different shapes: ["..."] for info, (["..."]) for processes, (("...")) for results, {"..."} for decisions.
- Keep each label SHORT (max 6 words) + 1 emoji.
- Use classDef for meaningful colors (e.g. classDef heat fill:#ef4444,stroke:#b91c1c,color:#fff) then apply with class A,B heat.
- 5-8 nodes. Arrow labels max 3 words. For cyclic processes, connect last node back to first.
`;
    } else if (toolType === 'report-remarks') {
      const { studentName, subject, marks, totalMarks, behavior = 'Good' } = payload;
      prompt = `
Write 3 distinct, highly personalized, constructive, and motivating Report Card remarks for parent-teacher review.
- Student Name: ${studentName}
- Subject: ${subject}
- Obtained Score: ${marks} / ${totalMarks} (${Math.round((marks / totalMarks) * 100)}%)
- Classroom Engagement / Attitude: ${behavior}

Provide:
1. Encouraging & Strength-Focused Remark
2. Growth-Oriented & Actionable Next Steps Remark
3. Formal & Concise Report Card Remark
`;
    } else {
      // General prompt
      prompt = payload.customQuery || 'How can I improve classroom engagement?';
    }

    const output = await callGemini(
      settings.geminiApiKey,
      settings.modelName || 'gemini-3.5-flash',
      settings.teacherSystemPrompt,
      [{ role: 'user', parts: [{ text: prompt }] }]
    );

    res.json({
      success: true,
      result: output,
      toolType
    });

  } catch (err) {
    console.error('Teacher AI Generator Error:', err);
    res.status(500).json({ msg: err.message || 'Failed to generate AI teaching content' });
  }
});

module.exports = router;
