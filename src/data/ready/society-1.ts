/** STEM 2, unit 2.1.1 (Section 1, Week 1, Focal Area 1): Robots and society 1, the broader societal impact of robots. */
import { build, mcq, short, type ReadyAssignment, type ReadyLesson, type ReadyTest } from './types';

const T = '/teaching/society-1';
const DECK = `${T}/Robots-and-Society-1-Impact-Analysis.pptx`;
const CHART = `${T}/impact-analysis-chart.pdf`;
const ELLIQ = `${T}/elli-q-scenario.pdf`;
const SCENARIOS = `${T}/agribot-renurse-scenarios.pdf`;

export const lesson: ReadyLesson = {
  key: 'society-1',
  title: 'Robots and society 1: weighing the good and the bad',
  summary: 'Analyse the positive and negative impacts of robots on society with a four-step impact analysis, then present a group analysis of AgriBot or ReNurse. Double period (2 hours).',
  year: 2,
  unitId: 'u2-1-1',
  topicId: 1,
  materials: [
    { unitId: 'u2-1-1', year: 2, title: 'Robots and society 1 slides: weighing the good and the bad', description: 'PowerPoint', kind: 'file', url: DECK, fileName: 'Robots-and-Society-1-Impact-Analysis.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', audience: 'learners', published: true },
    { unitId: 'u2-1-1', year: 2, title: 'Elli Q scenario (printable)', description: 'PDF, worked example for the impact analysis', kind: 'file', url: ELLIQ, fileName: 'elli-q-scenario.pdf', mime: 'application/pdf', audience: 'learners', published: true },
    { unitId: 'u2-1-1', year: 2, title: 'AgriBot and ReNurse scenarios with questions (printable)', description: 'PDF, Activity 1.1 scenarios and the scenario questions assignment', kind: 'file', url: SCENARIOS, fileName: 'agribot-renurse-scenarios.pdf', mime: 'application/pdf', audience: 'learners', published: true },
    { unitId: 'u2-1-1', year: 2, title: 'Activity 1.1 impact analysis chart (printable)', description: 'PDF, one per group', kind: 'file', url: CHART, fileName: 'impact-analysis-chart.pdf', mime: 'application/pdf', audience: 'learners', published: true },
  ],
  blocks: [
    { type: 'text', md: `# Today's mission
Robots can do amazing things, but every robot also changes the lives of the people around it, for better and sometimes for worse. Today you learn a step-by-step way to weigh up the good and the bad, then analyse a robot with your group and present it.

By the end you will be able to:
- list positive and negative impacts of a robot on society
- use the four steps of a societal impact analysis
- suggest ways to reduce harm and increase the benefits
- explain why humans and robots must work together
- present your group's analysis to the class

**You need:** your notebook, and one impact analysis chart per group. Book: Robotics Year 2, Section 1, pages 8 to 13.` },
    { type: 'link', label: 'View the slides', url: DECK },
    { type: 'link', label: 'Activity 1.1 impact analysis chart (print one per group)', url: CHART },

    { type: 'text', md: `## 1. Starter: good news or bad news? (pairs, 10 minutes)
For each place below, write one way a robot helps and one way it could cause a problem.

| Where | Example robot | Think about |
|---|---|---|
| On the farm | Drones that spray and map crops | Who gains? Who could lose out? |
| In the hospital | Drones that deliver blood and medicine | What changes for a patient in a far-away village? |
| In the factory | Robot arms that weld and pack | What happens to the people who did that work? |
| At home and in shops | Robot cleaners, self-checkout machines | What data might these machines collect about you? |

Since 2019, drones have delivered blood and vaccines to health centres across Ghana. That is one robot bringing both benefits and new questions.` },

    { type: 'text', md: `## 2. Recap: four key ideas from Year 1
- **Robot-human coexistence:** robots and people share homes, workplaces and communities safely, with rules robots cannot change themselves.
- **Roboethics:** right and wrong in the design and use of robots. Robots should not harm people, should respect privacy, act openly and stay within their role.
- **Safety in robotics:** standards and procedures that prevent accidents when robots work near people or other machines.
- **Jobs in robotics:** robots remove some jobs and create new ones. Next week you explore robotics careers.` },

    { type: 'text', md: `## 3. The four steps of a societal impact analysis
1. **Define the scenario and the robot's role.** What will the robot do, where, and for whom?
2. **Identify potential impacts.** Will it create or take away jobs? Will people need training? Could it improve health, the environment or education? Does it raise privacy, safety or fairness issues? Are there rules or ethical guidelines to follow?
3. **Reduce the negative impacts and increase the positive ones.** Safety features, secure data, clear rules of use, ways to spread the benefits.
4. **Think about the long term.** Will it go out of date quickly and create e-waste? Can it be upgraded for future needs?

Designers who follow these steps build robots that are useful **and** responsible.` },
    { type: 'check', question: 'A designer asks: "Will this robot become outdated quickly and end up as electronic waste?" Which step of the impact analysis is this?', options: ['Step 1: define the scenario', 'Step 2: identify potential impacts', 'Step 3: reduce the negative impacts', 'Step 4: think about the long term'], correct: 3, explanation: 'Obsolescence and e-waste are long-term impacts, so this is step 4.' },

    { type: 'link', label: 'Elli Q scenario (PDF to read or print)', url: ELLIQ },
    { type: 'text', md: `## 4. Worked example: Elli Q, a companion robot for elderly people
**Step 1: scenario and role.** Elli Q keeps elderly people who live alone company and helps with daily tasks.

| Function | What Elli Q does |
|---|---|
| Communication | Holds conversations; video calls with family and friends |
| Daily assistance | Reminds about medicine and appointments; turns on lights by voice |
| Health monitoring | Tracks heart rate and sleep; suggests seeing a doctor (it is not a medical device) |
| Emotional support | Notices the user's mood; encourages, plays calming music |
| Cognitive stimulation | Memory games, trivia and learning activities |

**Your turn (pairs, 3 minutes):** pick two functions. For each, write one good and one bad thing it could cause.

**Step 2: potential impacts.**

| Positive impacts | Possible negative impacts |
|---|---|
| Elderly people stay independent with help on daily tasks | Relying on it too much: less exercise and fewer visits |
| Health improves with medicine reminders and monitoring | Some users struggle with the technology and need training |
| Games and activities keep the mind healthy | Privacy: it records conversations, health data and activity |
| Less loneliness through calls and emotional support | Emotional responses may be wrong or manipulative if badly programmed |
| Health problems can be spotted early | Activities may not suit every person's needs or culture |

**Step 3: reduce the harm, increase the good.**
- **Balanced support:** encourage walks, visits and social activities, not just reliance on the robot.
- **Digital accessibility:** a simple interface, clear instructions and training.
- **Data transparency and control:** strong security; the user chooses what data is collected and how it is used.
- **Ethical programming:** responses support well-being and never pressure the user.
- **Inclusive design:** health and thinking activities suit people of all backgrounds and abilities.

**Step 4: the long term.**
- **Obsolescence:** software upgrades keep it up to date.
- **E-waste:** recycling or refurbishing old models.
- **Caregivers:** Elli Q helps human carers; it does not replace them.` },
    { type: 'check', question: 'Elli Q records conversations and health data. Which design choice best reduces this negative impact?', options: ['Make the robot cheaper', 'Strong data security, and let the user choose what is collected', 'Add more memory games', 'Let the robot decide who sees the data'], correct: 1, explanation: 'This is data transparency and control: protect the data and give the user control over it.' },

    { type: 'link', label: 'AgriBot and ReNurse scenarios (PDF to read or print)', url: SCENARIOS },
    { type: 'text', md: `## 5. Activity 1.1: analyse a robot in your group (groups of 3 to 5, 30 minutes)
Choose **one** scenario. You may state assumptions and add functions, for example AgriBot on a cocoa or maize farm, or ReNurse in a district hospital.

**Scenario A: AgriBot, the agricultural assistant robot**
- **Planting and seeding:** plants seeds at the best depth and spacing, reducing waste and increasing yield.
- **Weed control:** finds weeds with cameras and AI and removes them with very little herbicide.
- **Crop monitoring and irrigation:** checks soil moisture, nutrients and crop health for precise watering and fertiliser.
- **Harvesting:** can be adapted to harvest some crops, reducing manual labour.

**Scenario B: ReNurse, the robotic nursing assistant**
- **Patient monitoring:** checks vital signs, medication schedules and activity, giving nurses real-time data.
- **Basic care tasks:** delivers meals, moves patients, helps with mobility exercises.
- **Communication and companionship:** talks and plays games with patients.
- **Data collection and analysis:** gathers patient data and trends to help nurses decide on care.

**Steps**
1. Discuss what your robot does and how it might affect society.
2. Share with your group: what excites you about this robot? What worries you?
3. Fill in every section of the impact analysis chart:
   - Robot description: what it does and where
   - Positive impacts: at least three (jobs, environment, well-being)
   - Negative impacts: at least three (job loss, privacy, less human contact)
   - Ethical considerations: at least two (safety, data security, bias)
   - Reducing harm and the long term
   - Human-robot partnership: what humans still do, and why it matters
4. Decide who presents which part, then present your chart to the class (3 minutes).
5. Photograph your chart and upload it for the group presentation assignment.

**Sentence starters:** "One benefit for farmers is...", "A risk for patients is...", "To protect privacy, the designer should...", "Humans are still needed to..."

**Stretch:** if your robot makes a mistake that harms someone, who is responsible: the designer, the programmer or the user? Explain.` },
    { type: 'link', label: 'Print the impact analysis chart', url: CHART },

    { type: 'text', md: `## 6. Humans and robots together
Robots are fast, precise and never tired, but the best results come from a **partnership**. In robotic surgery the robot makes tiny, steady movements through small cuts, while the surgeon sits at the console, controls every arm and makes every decision. Nurses and doctors prepare and reassure the patient. Together: smaller cuts, less pain and faster recovery.` },
    { type: 'image', url: `${T}/surgery.jpg`, caption: 'A surgical robot and the surgeon\'s console (Robotics Year 2, Section 1)', alt: 'A surgical robot with three numbered arms beside the surgeon\'s control console' },
    { type: 'text', md: `What humans bring that robots cannot:
- **Creativity and problem-solving:** new ideas, handling the unexpected, adapting when things change.
- **Social intelligence and empathy:** building trust with customers, colleagues and patients.
- **Ethical decision-making:** judging complex situations so that robots act in line with society's values.

**Think about it (pairs):** the robot in Figure 1.1 collects empty cups and plates in a busy airport lounge. It stays in one area, stops at each table to ask for finished items, and returns to the kitchen when its shelves are full.
1. List two advantages and two disadvantages of using this robot.
2. Why might the lounge staff be unhappy with their robot colleague?
3. Name three other places where a robot like this could be useful.` },
    { type: 'image', url: `${T}/fig11.jpg`, caption: 'Figure 1.1: Robot in Amsterdam Airport, Netherlands (Robotics Year 2, page 25)', alt: 'A round service robot with shelves for empty cups and plates, standing in an airport lounge' },
    { type: 'check', question: 'Robots can make complex ethical decisions on their own. True or false?', options: ['True', 'False'], correct: 1, explanation: 'Robots can follow ethical rules they are programmed with, but complex situations need human judgement.' },
    { type: 'check', question: 'In robot-assisted surgery, who decides what the robot arms do?', options: ['The robot, using AI', 'The surgeon at the console', 'The patient', 'The hospital manager'], correct: 1, explanation: 'The surgeon controls every arm. The robot adds steadiness and precision; the human brings judgement.' },

    { type: 'text', md: `## Summary
- Every robot brings both good and bad effects on society.
- The four steps: define the scenario, identify impacts, reduce the harm and increase the good, think about the long term.
- Good designers plan to reduce harm before the robot is built.
- Humans and robots work best as partners: robots bring precision and speed; humans bring creativity, empathy and ethical judgement.

**Homework (Activity 1.2):** write a newspaper article of no more than 400 words on the impact of your group's robot, for readers with no technical knowledge. Use your group's chart. Read pages 14 to 24 (robotics careers) for next lesson.` },
  ],
};

const check = build([
  mcq('What does the term "roboethics" refer to?', ['The study of how robots are built', 'The principles guiding the ethical use of robots', 'How robots can replace human workers', 'The technical specifications of robot systems'], 1, 'Roboethics deals with right and wrong in the design and use of robots.'),
  mcq('Robots are capable of making complex ethical decisions on their own.', ['True', 'False'], 1, 'Robots follow the rules they are given. Complex situations need human judgement.'),
  mcq('Which is the FIRST step of a societal impact analysis?', ['Think about the long term', 'Reduce the negative impacts', 'Define the scenario and the robot\'s role', 'Identify potential impacts'], 2, 'You must know what the robot does and where before you can judge its impacts.'),
  mcq('A designer plans recycling for old robots and software upgrades for new ones. Which step is this?', ['Define the scenario', 'Identify potential impacts', 'Reduce negative impacts', 'Think about the long term'], 3, 'Obsolescence and e-waste are long-term impacts.'),
  mcq('Which is a NEGATIVE impact of AgriBot on a farming community?', ['Seeds planted at the best spacing', 'Less herbicide used on weeds', 'Fewer jobs for farm labourers', 'Precise watering saves water'], 2, 'Automating planting, weeding and harvesting can reduce the need for paid farm labour.'),
  mcq('ReNurse collects patient data. Which ethical issue does this raise most directly?', ['Electronic waste', 'Privacy and data security', 'Battery life', 'Speed of movement'], 1, 'Patient data is private; it must be protected and used only for care.'),
  mcq('Elli Q should "encourage users to stay active and socialise, not just rely on its assistance." Which mitigation is this?', ['Balanced support', 'Digital accessibility', 'Inclusive design', 'Data transparency and control'], 0, 'Balanced support tackles over-reliance on the robot.'),
  mcq('Which strength do humans bring to a human-robot partnership that robots lack?', ['Working without breaks', 'Repeating a task exactly', 'Empathy and building trust', 'Lifting heavy loads'], 2, 'Social intelligence and empathy are human strengths; the other three are robot strengths.'),
  mcq('Why should a designer consider BOTH positive and negative impacts before building a robot?', ['To make the robot cheaper', 'To reduce harm and increase benefits before problems happen', 'Because negative impacts never happen', 'So the robot can replace all workers'], 1, 'Looking at both lets the designer plan safety features and rules early.'),
  mcq('In robot-assisted surgery, the robot\'s main contribution is:', ['Deciding which operation to do', 'Steady, precise, very small movements', 'Comforting the patient', 'Signing the consent form'], 1, 'The robot adds precision and removes hand tremor; the surgeon makes the decisions.'),
  short('For ONE of these robots, AgriBot or ReNurse, identify two potential negative impacts on society. Explain each in no more than two sentences, and suggest how the designer could reduce ONE of them.',
    'Up to 2 marks per impact: 1 for a valid negative impact, 1 for a clear explanation (4 marks), plus 1 mark for a sensible way to reduce one of them (5 marks in all).\nAgriBot examples: fewer jobs for farm labourers (they lose income); high cost so only rich farmers benefit (inequality); breakdowns with no local technicians; farm data collected without consent; heavy machine compacts soil or harms people nearby. Reductions: retraining programmes, cooperative ownership, local technician training, data control for farmers, safety sensors.\nReNurse examples: patients get less human contact (loneliness); patient data could leak (privacy); a wrong reading could lead to wrong care (safety); nurses may fear job loss. Reductions: robot supports nurses rather than replacing them, strong data security, nurse checks every alert.', 5),
  short('A delivery robot makes a mistake and injures a pedestrian. Who is responsible: the robot designer, the programmer or the user? Explain your reasoning.',
    'Award marks for reasoning, not for one "right" answer (5 marks).\n1 mark: states that the robot itself cannot be held responsible because it cannot make complex ethical decisions.\nUp to 3 marks: explains the role of at least two parties, for example the designer if the safety features were poor, the programmer if a coding error caused it, the user or operating company if it was used outside its rules or not maintained.\n1 mark: a clear conclusion, for example responsibility can be shared, or depends on the cause, which is why safety standards and testing matter.', 5),
]);

export const test: ReadyTest = {
  key: 'society-1-check',
  year: 2,
  unitId: 'u2-1-1',
  title: 'Robots and society 1 check: impacts and coexistence',
  when: 'After the Robots and society 1 lesson. 10 auto-marked questions and 2 written answers you mark (20 marks, 30 minutes). Covers Review Questions 1.1 and Teacher Manual key assessment levels 1 to 3.',
  instructions: 'Answer every question on your own.\nQuestions 1 to 10 are marked automatically.\nQuestions 11 and 12 are written answers your teacher will mark.',
  timeLimitMin: 30,
  showResults: 'teacher',
  portfolioSection: 'tests',
  ...check,
};

export const presentation: ReadyAssignment = {
  key: 'society-1-presentation',
  year: 2,
  unitId: 'u2-1-1',
  title: 'Robots and society 1: group impact analysis presentation',
  when: 'During the lesson: Activity 1.1 and the Week 1 key assessment (group presentation). Mark each group on its chart and presentation (20 marks).',
  maxMarks: 20,
  allowText: true,
  allowFiles: true,
  portfolioSection: 'assignments',
  instructions: `Work in your group of 3 to 5. Choose AgriBot or ReNurse and complete the impact analysis chart, then present it to the class in about 3 minutes.
Upload a clear photo of your group's chart. In the text box, write the names of everyone in your group and the part each person presented.

Your chart must have:
1. Robot description: what it does and where
2. At least three positive impacts
3. At least three negative impacts
4. At least two ethical considerations
5. Ways to reduce harm, and the long-term impacts
6. The human-robot partnership: what humans still do, and why it matters

Marking (20 marks)
- Robot description is clear, with any assumptions stated (2)
- Three or more realistic positive impacts (3)
- Three or more realistic negative impacts (3)
- Two or more ethical considerations, explained (4)
- Sensible ways to reduce harm, and at least one long-term impact (3)
- Human-robot partnership explained (2)
- Presentation: clear, every member takes part, answers a question from the class (3)`,
};

export const article: ReadyAssignment = {
  key: 'society-1-article',
  year: 2,
  unitId: 'u2-1-1',
  title: 'Robots and society 1: newspaper article',
  when: 'Homework after the lesson: Activity 1.2. Each learner writes their own article from the group chart (20 marks).',
  maxMarks: 20,
  allowText: true,
  allowFiles: true,
  portfolioSection: 'assignments',
  instructions: `Activity 1.2: write an article of no more than 400 words on the likely impacts of your group's robot, AgriBot or ReNurse, on society.
Your readers are people who read the school journal or a local newspaper. They have no technical knowledge of robots, so write in a clear, interesting way.
Type your article in the box, or upload a clear photo of your handwritten article. Write it on your own, in your own words.

Your article should:
1. Have a headline that makes people want to read it
2. Describe what the robot does and where it works: farming or healthcare
3. Explain its positive and negative impacts on jobs, the environment, privacy and well-being
4. Discuss the ethical issues: safety, data security and possible bias
5. Show readers that humans and robots work together, and that the robot has a safe place in society
6. End with your own conclusion

Marking (20 marks)
- Headline and a clear opening that hooks the reader (2)
- Clear description of the robot and where it is used (3)
- Positive and negative impacts covering jobs, environment, privacy and well-being (6)
- Ethical issues discussed: safety, data security, bias (4)
- The human role alongside the robot is emphasised throughout (3)
- Written for a general reader and kept to 400 words or fewer (2)`,
};

export const scenarios: ReadyAssignment = {
  key: 'society-1-scenarios',
  year: 2,
  unitId: 'u2-1-1',
  title: 'Robots and society 1: AgriBot and ReNurse scenario questions',
  when: 'After the lesson, or as class work: each learner analyses both Activity 1.1 scenarios on their own (20 marks). Answer online or upload a photo or PDF.',
  maxMarks: 20,
  allowText: true,
  allowFiles: true,
  portfolioSection: 'assignments',
  instructions: `Read both scenarios first: [Open the AgriBot and ReNurse scenarios (PDF)](${SCENARIOS})
Work on your own. Answer in one of two ways:
- Type your answers in the box below, numbered 1 to 11, or
- Write them in your exercise book or on paper, then upload a clear photo or a PDF of every page.

Part A: AgriBot, the agricultural assistant robot
1. In your own words, describe what AgriBot does and where it would be used. (1)
2. List THREE positive impacts AgriBot could have on society. Think about jobs, the environment and well-being. (3)
3. List THREE negative impacts AgriBot could have on society. Think about job loss, cost and fairness, and safety. (3)
4. Explain ONE ethical issue raised by AgriBot, for example safety, data or bias. (1)
5. Choose one negative impact from question 3. How could the designer reduce it? (1)

Part B: ReNurse, the robotic nursing assistant
6. In your own words, describe what ReNurse does and where it would be used. (1)
7. List THREE positive impacts ReNurse could have on society. (3)
8. List THREE negative impacts ReNurse could have on society. Think about privacy, less human contact and jobs. (3)
9. Explain ONE ethical issue raised by ReNurse, for example patient data security or safety. (1)
10. Choose one negative impact from question 8. How could the designer reduce it? (1)

Part C: Humans and robots
11. Choose ONE of the two robots. Explain what humans will still do alongside it, and why this human-robot partnership is important. (2)

Total: 20 marks. One mark for each sensible, clearly explained point.`,
};
