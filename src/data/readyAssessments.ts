/**
 * Ready-made tests and assignments a teacher can add with one tap (Teacher > Tests, Teacher > Assignments).
 * Each is saved as an ordinary draft, so the teacher can edit, assign a class, set dates and publish it.
 * Sources: Robotics for SHS Year 3 (learner book), Section 5, and the Year 3 Teacher Manual, Section 5,
 * Focal Area 1 key assessment and marking schemes (weeks 11 to 16).
 */
import type { KeyEntry, Question, ShowResults } from '../firebase/assessments';

export interface ReadyTest {
  key: string;
  title: string;
  /** When to use it, shown to the teacher in the picker */
  when: string;
  instructions: string;
  timeLimitMin: number;
  showResults: ShowResults;
  portfolioSection: 'tests' | 'semester';
  questions: Question[];
  answers: Record<string, KeyEntry>;
}

export interface ReadyAssignment {
  key: string;
  title: string;
  when: string;
  instructions: string;
  maxMarks: number;
  allowText: boolean;
  allowFiles: boolean;
  portfolioSection: 'assignments' | 'projects';
}

/** Build question + answer-key pairs with ids q1, q2 ... */
function build(items: { q: Omit<Question, 'id'>; k: KeyEntry }[]) {
  const questions: Question[] = [];
  const answers: Record<string, KeyEntry> = {};
  items.forEach((it, i) => { const id = `q${i + 1}`; questions.push({ id, ...it.q }); answers[id] = it.k; });
  return { questions, answers };
}
const mcq = (text: string, options: string[], correct: number, explanation: string, marks = 1) => ({ q: { type: 'mcq' as const, text, options, marks }, k: { correct, explanation } });
const num = (text: string, value: number, explanation: string, unit?: string, marks = 1) => ({ q: { type: 'number' as const, text, unit, marks }, k: { value, tolerance: 0.001, explanation } });
const short = (text: string, model: string, marks: number) => ({ q: { type: 'short' as const, text, marks }, k: { model } });

/* ---------------- Python 1: lesson check (use straight after the lesson) ---------------- */
const lessonCheck = build([
  mcq('Which of these is a valid Python variable name?', ['3speed', 'speed 3', 'speed_3', 'battery%'], 2, 'speed_3 uses letters, a number and an underscore and does not start with a number.'),
  mcq('What does this print?\nx = 4\nx = x * 3\nprint(x)', ['4', '7', '12', 'x * 3'], 2, 'Python works out the right side first: 4 * 3 = 12, then stores 12 in x.'),
  mcq('In Python, what does the = sign do in  speed = 50 ?', ['Checks whether speed is equal to 50', 'Stores the value 50 in the variable speed', 'Prints 50 on the screen', 'Adds 50 to speed'], 1, '= is assignment: it stores the value on the right in the variable on the left.'),
  mcq('What is the data type of 45.0 ?', ['int', 'float', 'bool', 'str'], 1, 'It has a decimal point, so it is a float.'),
  mcq('What is the data type of "25" ?', ['int', 'float', 'bool', 'str'], 3, 'The quotation marks make it text (a string), even though it looks like a number.'),
  mcq('A robot must remember whether its gripper is open. Which value suits this best?', ['"open"', 'True', '1.0', 'gripper'], 1, 'Open or closed is a yes/no fact, so a bool (True or False) fits best.'),
  mcq('Which line will cause a SyntaxError?', ['robot_name = "Zeta"', '_count = 3', 'robot name = "Zeta"', 'distance_cm = 12.5'], 2, 'Variable names cannot contain spaces.'),
  mcq('What happens when Python runs  print(7 + "ab") ?', ['It prints 7ab', 'It prints 7 ab', 'TypeError: a number cannot be added to text', 'NameError'], 2, 'You cannot add an int to a str. print(7, "ab") would show both.'),
  mcq('What does print(10 / 2) show?', ['5', '5.0', '5.00', '10 / 2'], 1, 'The / operator always gives a float.'),
  num('What is 17 // 5 ?', 3, '// keeps only the whole number part: 17 divided by 5 is 3 remainder 2.'),
  num('What is 17 % 5 ?', 2, '% gives the remainder: 17 = 3 x 5 + 2.'),
  num('What is 2 ** 4 ?', 16, '** is power: 2 x 2 x 2 x 2 = 16.'),
  num('A robot uses 0.5% of its power every minute. How much power (in %) does a 90-minute mission use?', 45, 'power_used = 90 * 0.5 = 45.', '%'),
  num('The battery has 62.5% left and the robot uses 0.5% per minute. How many more minutes can it run?', 125, 'time_left = 62.5 / 0.5 = 125.', 'minutes'),
  short('A robot that delivers medical supplies to remote villages in Ghana must manage a lot of data. Give TWO reasons why it should be programmed in Python rather than with blocks. (4 marks)',
    'Teacher Manual rubric: 2 marks for two distinct, well-reasoned reasons; 2 marks for linking them to this robot\'s needs.\nAcceptable reasons: Python scales to large, complex programs (routes, payload, events); it gives precise control and custom behaviours; it works with advanced libraries and tools (maps, sensors, data); it has detailed error messages and debugging tools, important when a fault could stop an emergency delivery.', 4),
  short('For the same delivery robot, state the best Python data type for each piece of information and justify each choice (2 marks each: 1 for the type, 1 for the reason):\ni. Robot identification number, e.g. "DRONE-GH-001"\nii. Current payload weight in kilograms (may not be a whole number)\niii. Total number of successful deliveries\niv. Whether the delivery hatch is open or closed',
    'i. str: it is text made of letters, numbers and dashes, never used for maths.\nii. float: weight can have a decimal part (e.g. 2.75 kg).\niii. int: you count whole deliveries; there is no half delivery.\niv. bool: only two states, open or closed (True or False), used for decisions.', 8),
  short('Write four lines of Python that create variables for i to iv above, with suitable names and example values. (4 marks)',
    'One mark per correct line: a valid, meaningful name and a value of the right type, e.g.\nrobot_id = "DRONE-GH-001"\npayload_weight_kg = 2.75\nsuccessful_deliveries = 14\nhatch_is_open = False', 4),
]);

/* ---------------- Teacher Manual key assessment, written part (after the Lists lesson) ---------------- */
const keyWritten = build([
  short('Data Management Strategy for a Humanitarian Robot\nA newly designed robotic system delivers medical supplies to remote villages in Ghana during emergencies. It must log its route points, track its payload status and record any environmental anomalies (e.g. unexpected rainfall, rough terrain).\n\n(a) Justify the transition from block-based programming to Python for this humanitarian robot. Give at least two distinct reasons directly relevant to the complexity or requirements of such a robot. (4 marks)',
    'Rubric (Teacher Manual): Justification for Python, 2 marks: two distinct, well-reasoned justifications. Linking to Python\'s capabilities, 2 marks: links scalability, control, integration and debugging to the robot\'s complex needs.\nExamples: many route points and events need a scalable program; precise control of payload and hatch; integration with GPS, weather and map libraries; clear error messages and debugging tools for a robot that must not fail in an emergency.', 4),
  short('(b) Propose a Python variable and data type strategy for storing:\ni. Robot identification number (e.g. "DRONE-GH-001")\nii. Current payload weight (in kilograms, which might not be a whole number)\niii. The total number of successful deliveries made\niv. A status showing if its main delivery hatch is open or closed\nv. A list of the last three critical events during a mission (e.g. "Heavy Rainfall Detected", "Path Obstruction", "Low Battery Warning")\nFor each, state the most appropriate data type and justify your choice.',
    'Rubric (Teacher Manual): Data strategy and justification, 10 marks: 5 marks for correct data types for all five items, 5 marks for clear, logical justifications.\ni. str: text identifier, not used in calculations.\nii. float: weight can have decimals.\niii. int: whole count of deliveries.\niv. bool: only open or closed (True/False).\nv. list (of str): an ordered collection that can grow and be updated, e.g. last_three_critical_events = ["Heavy Rainfall Detected", "Path Obstruction", "Low Battery Warning"].', 10),
  short('(c) Explain how Python\'s list data structure would be advantageous for managing last_three_critical_events compared to storing each event in a separate, individual variable. Give at least three points.',
    'Rubric (Teacher Manual): Advantage of lists, 6 marks: at least 3 well-explained points, 2 marks each.\nPoints: a list keeps events in order (first to last); its size can change (append new events, remove old ones with pop) without new variable names; it can be looped over or printed in one step; all events are grouped under one name, so the program is shorter and easier to read and fix; individual items can still be reached by index, e.g. events[0] or events[-1].', 6),
]);

export const READY_TESTS: ReadyTest[] = [
  {
    key: 'python-1-check',
    title: 'Python 1 check: variables, data types and operations',
    when: 'Straight after the Python 1 lesson. 14 auto-marked questions and 3 written answers you mark (30 marks, 40 minutes).',
    instructions: 'Answer every question on your own.\nQuestions 1 to 14 are marked automatically.\nQuestions 15 to 17 are written answers your teacher will mark.\nYou may not use VS Code or the Python practice page during this test.',
    timeLimitMin: 40,
    showResults: 'teacher',
    portfolioSection: 'tests',
    ...lessonCheck,
  },
  {
    key: 'python-key-written',
    title: 'Key assessment (Teacher Manual): data management strategy for a humanitarian robot',
    when: 'Teacher Manual, Section 5, Focal Area 1, DoK level 3. 20 marks, written answers you mark with the manual\'s rubric. Set after the Lists lesson.',
    instructions: 'Teacher Manual key assessment, Section 5, Focal Area 1 (DoK level 3: short answers and extended response).\nWrite full answers in your own words. Give reasons, not just names.\nMarks: (a) 4, (b) 10, (c) 6. Total 20.',
    timeLimitMin: 0,
    showResults: 'teacher',
    portfolioSection: 'tests',
    ...keyWritten,
  },
];

export const READY_ASSIGNMENTS: ReadyAssignment[] = [
  {
    key: 'python-1-reporter',
    title: 'Python 1 practical: Robot System Status Reporter',
    when: 'Straight after the Python 1 lesson. The Teacher Manual\'s learning task (requirements 1, 2, 3 and 5), 20 marks.',
    maxMarks: 20,
    allowText: true,
    allowFiles: true,
    portfolioSection: 'assignments',
    instructions: `Write ONE Python program called status_reporter.py for your own simulated robot. Work on your own.

1. Robot identification
- robot_id: a string with a unique name, e.g. "AccraBot-Alpha"
- system_purpose: a string describing what the robot does, e.g. "Urban sanitation support"

2. Operational data
- mission_duration_minutes: an int, e.g. 120
- current_power_level_percent: a float, e.g. 78.5
- is_operational: a bool, True or False

3. Performance calculation (the robot uses 0.5% of its power every minute)
- total_power_consumed_percent = mission_duration_minutes * 0.5
- estimated_remaining_operating_minutes = current_power_level_percent / 0.5

4. Report
- Print a report that starts with the title ROBOT SYSTEM DAILY STATUS REPORT
- Show every value with a clear label, in a tidy order

Hand in: upload status_reporter.py AND a screenshot (or photo) of the output.

Marking (20 marks)
- Identification: correct string variables (2), printed with labels (2)
- Operational data: correct int, float and bool (3), printed with labels (3)
- Calculations: power consumed correct (2), remaining minutes correct (2), both printed with clear meaning (2)
- Report: title at the top (1), clear and well organised (2), program runs without errors (1)

Extra challenge (not marked): ask for the robot's name with input(), or show the remaining time in hours and minutes using // and %.`,
  },
  {
    key: 'python-key-practical',
    title: 'Key assessment (Teacher Manual): Advanced Robot Data Analyser',
    when: 'Teacher Manual, Section 5, Focal Area 1, DoK level 4 individual practical task and presentation. 18 marks plus 2 bonus. Set after the Lists lesson.',
    maxMarks: 20,
    allowText: true,
    allowFiles: true,
    portfolioSection: 'projects',
    instructions: `Teacher Manual key assessment, Section 5, Focal Area 1 (DoK level 4: individual practical task and presentation).

Expand your Robot System Status Reporter, or write a new program, that simulates a robot collecting sensor data and analysing it.

1. Data generation and storage
a. A list called temperature_readings with at least ten temperatures in degrees Celsius (floats).
b. A list called humidity_readings with ten matching humidity percentages (ints).
c. A list called robot_path of at least five (x, y) points, e.g. [(0, 0), (1, 2), (3, 1), (4, 4), (5, 2)].

2. Data analysis and calculation
a. The average temperature (hint: sum() and len()).
b. The maximum humidity (hint: max()).
c. The total "distance" travelled, counting each step between points as 1 unit (hint: count the steps).
d. Bonus challenge (2 marks): the real (Euclidean) distance between each pair of points, added up.

3. Structured output
Print a "Robot Environmental and Path Analysis Report" showing the three original lists, the average temperature, the maximum humidity and the total distance, with clear labels and a tidy layout.

Hand in: upload your .py file and a screenshot of the output. Be ready to present your program to the class.

Marking (18 marks plus 2 bonus), from the Teacher Manual
- temperature_readings: at least 10 floats in a correct list (2)
- humidity_readings: at least 10 ints in a correct list (2)
- robot_path: at least 5 (x, y) tuples, correct syntax (2)
- All three lists logical, well named, valid syntax (2)
- Average temperature with sum() / len(), correct (2)
- Maximum humidity with max() (1)
- Total distance = len(robot_path) - 1, clearly shown (2)
- Original lists displayed clearly (1)
- All three calculated values displayed with labels (2)
- Report headings, spacing and layout (2)
- Bonus: Euclidean distance (2)`,
  },
];
