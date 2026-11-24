/** STEM 3, unit 3.3.2 (Section 5, Focal Area 2): Python 3, making decisions with if, elif and else. */
import { build, mcq, num, short, type ReadyAssignment, type ReadyLesson, type ReadyTest } from './types';

const T = '/teaching/python-3';
const DECK = `${T}/Python-3-Making-Decisions.pptx`;

export const lesson: ReadyLesson = {
  key: 'python-3',
  title: 'Python for robots 3: making decisions with if, elif and else',
  summary: 'Compare values, then let the robot decide with if, if-else, if-elif-else and nested conditions. Double period (2 hours) in VS Code.',
  year: 3,
  unitId: 'u3-3-2',
  topicId: 6,
  materials: [
    { unitId: 'u3-3-2', year: 3, title: 'Python 3 slides: making decisions with if, elif and else', description: 'PowerPoint', kind: 'file', url: DECK, fileName: 'Python-3-Making-Decisions.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', audience: 'learners', published: true },
    { unitId: 'u3-3-2', year: 3, title: 'Python 3 starter files for VS Code', description: 'Unzip, then File > Open Folder in VS Code', kind: 'file', url: `${T}/python-3-starter-files.zip`, fileName: 'python-3-starter-files.zip', mime: 'application/zip', audience: 'learners', published: true },
  ],
  blocks: [
    { type: 'text', md: `# Today's mission
A robot that only follows a list of steps is not very smart. A smart robot **decides**: if the battery is low, go and charge; if there is an obstacle, turn. Today you write those decisions in Python.

By the end you will be able to:
- write conditions with \`==\`, \`!=\`, \`<\`, \`>\`, \`<=\` and \`>=\`
- use \`if\`, \`if-else\` and \`if-elif-else\` to choose what the robot does
- combine conditions with \`and\`, \`or\` and \`not\`
- put one decision inside another (nested conditions) with correct indentation
- read a number typed by the user with \`float(input())\`

**You need:** VS Code (or Python practice on this site). Book: Robotics for SHS Year 3, Section 5, pages 93 to 97.` },
    { type: 'link', label: 'View the slides', url: DECK },
    { type: 'link', label: 'Download the VS Code starter files (.zip)', url: `${T}/python-3-starter-files.zip` },
    { type: 'link', label: 'No VS Code? Open Python practice', url: '/python?example=conditions' },

    { type: 'text', md: `## 1. Activity 5.8: control flow recap (groups of 2 or 3, 10 minutes)
In Year 1 you used blocks to make decisions and repeat actions. Copy this table and fill in the purpose of each term and a robot example. The first row is done for you.

| Term | Purpose | Robot example |
|---|---|---|
| if | Do something only when a condition is true | If the robot sees an obstacle, it turns left |
| else | | |
| else if | | |
| for | | |
| while | | |
| break | | |
| continue | | |

Today is about the first three. Loops (for, while, break, continue) are next lesson.` },

    { type: 'text', md: `## 2. Conditions: questions with True or False answers
A condition compares two values. The answer is always \`True\` or \`False\` (a bool, from Python 1).

| Symbol | Means | Example | Result when battery_level = 15 |
|---|---|---|---|
| \`==\` | is equal to | \`battery_level == 15\` | True |
| \`!=\` | is not equal to | \`battery_level != 15\` | False |
| \`<\` | less than | \`battery_level < 20\` | True |
| \`>\` | greater than | \`battery_level > 50\` | False |
| \`<=\` | less than or equal to | \`battery_level <= 15\` | True |
| \`>=\` | greater than or equal to | \`battery_level >= 20\` | False |

Careful: **one** \`=\` stores a value; **two** \`==\` ask a question.` },
    { type: 'check', question: 'speed = 30\nWhat is the value of  speed >= 30 ?', options: ['True', 'False', '30', 'An error'], correct: 0, explanation: '>= means "greater than or equal to". 30 is equal to 30, so the answer is True.' },

    { type: 'text', md: `## 3. if, if-else and if-elif-else
**Simple if:** do something only when the condition is true.` },
    { type: 'image', url: `${T}/fig58.jpg`, caption: 'Figure 5.8: a simple if in blocks and in Python (Robotics for SHS Year 3)', alt: 'An if block checking battery_level < 20 next to the same if statement in Python' },
    { type: 'text', md: `Two rules that blocks did for you:
- The \`if\` line ends with a **colon** \`:\`.
- The lines that belong to the \`if\` are **indented** by 4 spaces (press Tab in VS Code).

**if-else:** one thing when the condition is true, another when it is false.` },
    { type: 'image', url: `${T}/fig59.jpg`, caption: 'Figure 5.9: if-else in blocks and in Python', alt: 'An if-else block with Turn Left and Keep Going next to the same code in Python' },
    { type: 'text', md: `**if-elif-else:** check several conditions in order. Python runs the **first** one that is true and skips the rest.
\`\`\`
traffic_light = "yellow"

if traffic_light == "green":
    print("Go")
elif traffic_light == "yellow":
    print("Slow down")
else:
    print("Stop")
\`\`\`
Output: **Slow down**. Try "green", "red", and then "blue": why does "blue" print Stop?` },
    { type: 'check', question: 'battery = 45\nif battery > 80:\n    print("Full")\nelif battery > 30:\n    print("OK")\nelse:\n    print("Low")\nWhat is printed?', options: ['Full', 'OK', 'Low', 'OK and Low'], correct: 1, explanation: '45 > 80 is False, 45 > 30 is True, so "OK" is printed and the else is skipped.' },
    { type: 'link', label: 'Try if, elif and else in Python practice', url: '/python?example=traffic-light' },

    { type: 'text', md: `## 4. and, or, not
You met these in Boolean algebra (Year 2). Python uses the same words:
- \`battery > 50 and not obstacle\`: both must be true
- \`temperature > 35 or smoke_detected\`: at least one must be true
- \`not is_operational\`: the opposite of the value

## 5. Nested decisions
Put one decision inside another when the robot must check one thing first:
\`\`\`
battery_level = 60
obstacle_detected = True

if battery_level > 50:
    print("Battery level sufficient.")
    if obstacle_detected:
        print("Stop and reroute.")
    else:
        print("Continue moving forward.")
else:
    print("Battery too low! Return to charging station.")
\`\`\`
Output: **Battery level sufficient.** then **Stop and reroute.**

Tips from the book:
- Indentation shows which lines belong together. Get it wrong and Python stops with **IndentationError**.
- Do not nest too deeply; it gets hard to read.
- \`and\`, \`or\` can often replace a nested if.` },
    { type: 'link', label: 'Try the nested example in Python practice', url: '/python?example=nested' },
    { type: 'check', question: 'battery = 60\nobstacle = False\nIs  battery > 50 and not obstacle  True or False?', options: ['True', 'False', 'An error', 'It depends on the robot'], correct: 0, explanation: 'battery > 50 is True. obstacle is False, so not obstacle is True. True and True gives True.' },

    { type: 'text', md: `## 6. Activity 5.9: temperature-based movement (pairs, 20 minutes)
1. Ask the user for a temperature. \`input()\` always gives **text**, so turn it into a number:
\`\`\`
temperature = float(input("Temperature in degrees C: "))
\`\`\`
2. Use \`if\`, \`elif\` and \`else\` to print what the robot should do:
   - above 25: **Move to cooler area**
   - 18 to 25: **Stay in place**
   - below 18: **Seek warmer area**
3. Test with 30, 25, 18 and 10. Do 25 and 18 give the answer you expect?

**Challenge:** add extreme heat (above 35). Where in the chain must it go, and why?

In Python practice, type the temperature in the **Input** box before you press Run.` },
    { type: 'link', label: 'Activity 5.9 in Python practice', url: '/python?example=temperature' },
    { type: 'check', question: 'For Activity 5.9, which condition order is correct?', options: ['if temp > 25 ... elif temp > 35 ...', 'if temp > 35 ... elif temp > 25 ...', 'Either order works the same', 'You cannot use two > in one chain'], correct: 1, explanation: 'Python runs the first true condition. If > 25 came first, 40 would match it and never reach the > 35 branch.' },

    { type: 'text', md: `## Summary
- A condition is a True or False question: \`==\`, \`!=\`, \`<\`, \`>\`, \`<=\`, \`>=\`.
- \`if\` lines end with a colon, and the lines under them are indented.
- \`elif\` checks the next condition; only the first true branch runs.
- \`and\`, \`or\`, \`not\` combine conditions; nested ifs check one thing first.
- \`float(input())\` turns typed text into a number.

**Homework:** write battery_check.py. It asks for the battery level and prints Full (above 80), Good (50 to 80), Low (20 to 49) or Critical, return to base (below 20). Read pages 97 to 104 (loops) for next lesson.` },
  ],
};

const check = build([
  mcq('Which line correctly checks whether speed is equal to 50?', ['if speed = 50:', 'if speed == 50:', 'if speed equals 50:', 'if (speed = 50)'], 1, 'Two equal signs ask a question; one equal sign stores a value.'),
  mcq('battery_level = 15\nWhat is  battery_level != 15 ?', ['True', 'False', '15', 'An error'], 1, '!= means "not equal". battery_level IS 15, so the answer is False.'),
  mcq('What is missing from this line?\nif distance < 10', ['Brackets', 'A colon at the end', 'An else', 'Quotation marks'], 1, 'Every if, elif and else line ends with a colon.'),
  mcq('x = 7\nif x > 10:\n    print("A")\nelif x > 5:\n    print("B")\nelse:\n    print("C")\nWhat is printed?', ['A', 'B', 'C', 'B and C'], 1, '7 > 10 is False; 7 > 5 is True, so B is printed and the else is skipped.'),
  mcq('light = "blue"\nif light == "green":\n    print("Go")\nelif light == "yellow":\n    print("Slow down")\nelse:\n    print("Stop")\nWhat is printed?', ['Go', 'Slow down', 'Stop', 'Nothing'], 2, 'Neither condition is true, so the else runs.'),
  mcq('battery = 60\nobstacle = False\nWhat is  battery > 50 and not obstacle ?', ['True', 'False', '60', 'An error'], 0, 'battery > 50 is True and not False is True; True and True is True.'),
  mcq('Which value is True?', ['5 > 9 or 2 > 3', '5 > 9 and 2 < 3', 'not (5 > 9)', '5 == "5"'], 2, '5 > 9 is False, so not (5 > 9) is True. 5 == "5" is False: a number is not equal to text.'),
  mcq('What does Python show if the lines under an if are not indented?', ['NameError', 'IndentationError', 'TypeError', 'Nothing, it still runs'], 1, 'The lines that belong to an if must be indented, usually by 4 spaces.'),
  mcq('The user types 30 for  t = input("Temperature: ")\nWhat is the type of t?', ['int', 'float', 'str', 'bool'], 2, 'input() always gives text. Use float(input(...)) to get a number.'),
  num('score = 0\nbattery = 75\nif battery > 50:\n    score = score + 10\n    if battery > 70:\n        score = score + 5\nelse:\n    score = score + 1\nWhat is score at the end?', 15, 'battery > 50 adds 10; inside it, battery > 70 adds 5. The else does not run. 0 + 10 + 5 = 15.'),
  short('A security robot patrols a school at night. Describe THREE decisions it should make with if, elif or else. For each, give the condition and the action, and say which sensor gives the information.',
    'Up to 2 marks per decision (1 for a sensible condition linked to a sensor, 1 for a suitable action), 6 marks.\nExamples: if motion detected (PIR sensor) then sound alarm and send message; if battery < 20 (battery sensor) then return to charging dock; if obstacle closer than 10 cm (ultrasonic sensor) then stop and turn; if door is open (door switch) then report the room; if temperature > 50 or smoke (temperature/smoke sensor) then fire alert.', 6),
  short('Write a Python if-elif-else chain that prints "Full" when battery is above 80, "Good" when it is from 50 to 80, and "Low" otherwise.',
    '1 mark each for: the if battery > 80 branch; the elif battery >= 50 branch (or > 49); the else branch; correct colons and indentation (4 marks).\nif battery > 80:\n    print("Full")\nelif battery >= 50:\n    print("Good")\nelse:\n    print("Low")', 4),
]);

export const test: ReadyTest = {
  key: 'python-3-check',
  year: 3,
  unitId: 'u3-3-2',
  title: 'Python 3 check: making decisions',
  when: 'Straight after the Python 3 lesson. 10 auto-marked questions and 2 written answers you mark (20 marks, 30 minutes).',
  instructions: 'Answer every question on your own.\nQuestions 1 to 10 are marked automatically.\nQuestions 11 and 12 are written answers your teacher will mark.\nYou may not use VS Code or the Python practice page during this test.',
  timeLimitMin: 30,
  showResults: 'teacher',
  portfolioSection: 'tests',
  ...check,
};

export const practical: ReadyAssignment = {
  key: 'python-3-decisions',
  year: 3,
  unitId: 'u3-3-2',
  title: 'Python 3 practical: the robot decision maker',
  when: 'Straight after the Python 3 lesson. Extends Activity 5.9 with nested decisions (20 marks).',
  maxMarks: 20,
  allowText: true,
  allowFiles: true,
  portfolioSection: 'assignments',
  instructions: `Write decision_maker.py for a field robot (for example a farm robot or a delivery robot). Work on your own.
Write it in Python practice and press Hand in (type your test answers in the Input box), or upload your .py file from VS Code with screenshots of two different runs.

1. Inputs
- Ask for the battery level (%), the temperature (degrees C) and whether there is an obstacle (yes/no)
- Turn the numbers into numbers with float(input(...))

2. Decisions
- Battery below 20: print a message to return to the charging station, and decide nothing else
- Otherwise, using a nested if or elif:
  - obstacle ahead: stop and reroute
  - temperature above 35: move to shade
  - otherwise: continue the mission

3. Output
- Start with a title that includes your robot's name
- Each message says clearly what the robot will do and why

4. Test it
- Run it at least twice with different inputs that give different decisions

Marking (20 marks)
- Three inputs read correctly, numbers converted with float() (4)
- Battery check comes first and stops the other decisions (3)
- Nested if or elif chain for obstacle, heat and all clear (5)
- Correct comparison operators and conditions (3)
- Colons and indentation correct; runs without errors (2)
- Clear title and messages (2)
- Evidence of two different test runs (1)

Extra challenge (not marked): use and / or to make one condition do the work of two.`,
};
