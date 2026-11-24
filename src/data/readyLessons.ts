/**
 * Ready-made lessons a teacher can add to the class with one tap (Teacher > Lessons).
 * Each is saved as an ordinary draft lesson, so the teacher can edit, assign and publish it.
 * Files they link to live in public/teaching/.
 */
import type { Block } from '../firebase/lessons';
import type { Material } from '../firebase/units';

export interface ReadyLesson {
  key: string;
  title: string;
  summary: string;
  year: number;
  unitId: string;
  topicId: number;
  blocks: Block[];
  /** Added to the unit's materials (skipped if one with the same title already exists). */
  materials: Omit<Material, 'id' | 'createdAt' | 'order'>[];
}

const T = '/teaching/python-1';

export const READY_LESSONS: ReadyLesson[] = [
  {
    key: 'python-1',
    title: 'Python for robots 1: variables, data types and operations',
    summary: 'Store robot data in variables, name them correctly, choose data types and calculate. Double period (2 hours) in VS Code.',
    year: 3,
    unitId: 'u3-3-2',
    topicId: 6,
    materials: [
      { unitId: 'u3-3-2', year: 3, title: 'Python 1 slides: variables, data types and operations', description: 'PowerPoint, 25 slides', kind: 'file', url: `${T}/Python-1-Variables-Data-Types-Operations.pptx`, fileName: 'Python-1-Variables-Data-Types-Operations.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 1125740, audience: 'learners', published: true },
      { unitId: 'u3-3-2', year: 3, title: 'Python 1 starter files for VS Code', description: 'Unzip, then File > Open Folder in VS Code', kind: 'file', url: `${T}/python-1-starter-files.zip`, fileName: 'python-1-starter-files.zip', mime: 'application/zip', size: 3096, audience: 'learners', published: true },
      { unitId: 'u3-3-2', year: 3, title: 'Python practice (runs in the browser)', description: 'Write and run Python with no install', kind: 'link', url: '/python', audience: 'learners', published: true },
    ],
    blocks: [
      { type: 'text', md: `# Today's mission
Today we stop dragging blocks and start typing real Python, the language engineers use to program robots.

By the end you will be able to:
- create variables and give them values with =
- name variables using Python's naming rules
- choose the right data type: int, float, bool or str
- calculate robot data with \`+ - * / // % **\`
- print clear, labelled results

**You need:** VS Code with the Python extension, or the Python practice page on this site. Book: Robotics for SHS Year 3, Section 5, pages 84 to 90.` },
      { type: 'link', label: 'Download the slides (PowerPoint)', url: `${T}/Python-1-Variables-Data-Types-Operations.pptx` },
      { type: 'link', label: 'Download the VS Code starter files (.zip)', url: `${T}/python-1-starter-files.zip` },
      { type: 'link', label: 'No VS Code? Open Python practice', url: '/python?example=hello' },

      { type: 'text', md: `## 1. From blocks to Python
Each block you used in SPIKE Prime becomes one line of text. The computer reads the lines from top to bottom. Spelling, brackets and spaces now matter.` },
      { type: 'image', url: `${T}/fig52_block_vs_python.jpg`, caption: 'Figure 5.2: the same robot program in blocks and in Python (Robotics for SHS Year 3)', alt: 'A block program next to the same program written in Python' },
      { type: 'text', md: `In VS Code: File > Open Folder, make a new file called **robot_id.py**, type this and press the Run button (the triangle, top right).
\`\`\`
# My first Python program
print("Hello, robot")
\`\`\`
You should see **Hello, robot** in the terminal.

Rules to remember:
- One instruction per line.
- print works; Print and PRINT give an error.
- Brackets and quotation marks come in pairs.
- # starts a comment: a note for people that Python ignores.
- Do not put spaces at the start of a line (until we learn if and loops).` },

      { type: 'text', md: `## 2. Variables
A **variable** is a labelled box in the computer's memory. The label is the variable's name; what is inside is its value. You made variables with Set blocks in SPIKE Prime. In Python you use = :
\`\`\`
speed = 50
message = "Hello, robot"

print(message)
print("Speed:", speed)
\`\`\`
Output:
\`\`\`
Hello, robot
Speed: 50
\`\`\`
Read = as "store", not "is equal to": put 50 into the box called speed. Text needs quotation marks; numbers do not. The comma in print adds a space.` },
      { type: 'image', url: `${T}/fig54_message_block_python.jpg`, caption: 'Figure 5.4: the same variable in blocks and in Python', alt: 'A Set message block next to message = "Hello World!" in Python' },
      { type: 'text', md: `### Python works out the right side first
\`\`\`
x = 10
x = x + 10
print(x)
\`\`\`
Python works out x + 10 (that is 20), then stores it in x. The old 10 is gone. In maths x = x + 10 is impossible; in Python it means "add 10 to x". A robot does the same with distance_travelled = distance_travelled + 5 each time it moves.` },
      { type: 'check', question: 'What does this print?   x = 4   then   x = x * 3   then   print(x)', options: ['4', '7', '12', 'x * 3'], correct: 2, explanation: 'Python works out x * 3 (4 x 3 = 12) first, then stores 12 in x.' },
      { type: 'text', md: `### Activity 5.2: your robot's ID card (pairs, 10 minutes)
1. Create a variable **robot_id** with a unique name, for example "AccraBot-Alpha".
2. Create **system_purpose** with what your robot does, for example "Cleaning gutters in cities".
3. Print both with clear labels.
4. Extra: add maker_name and year_built.

Discuss: what was easier with blocks? What can Python do better?` },
      { type: 'link', label: 'Try Activity 5.2 in Python practice', url: '/python?example=robot-id' },

      { type: 'text', md: `## 3. Naming rules
Rules 1 to 3 cause errors if you break them. Rules 4 and 5 help people read your code.
1. Use only letters, numbers and _. Never start with a number. **message_1** works; **1_message** does not.
2. No spaces: join words with _. **greeting_message** works; **greeting message** does not.
3. Do not use Python's own words such as print, class, return or None.
4. Short but meaningful: **student_name** is better than s_n or x.
5. Avoid l, I and O on their own: they look like 1 and 0.

Names are case sensitive: Speed and speed are two different variables. Python style is lowercase words joined by _.

If you break a rule, Python shows an error such as:
\`\`\`
robot name = "Zeta"
SyntaxError: invalid syntax
\`\`\`
Read the last line of an error first: it names the problem. Then find the line number.` },
      { type: 'check', question: 'Which of these is a valid variable name?', options: ['3speed', 'speed 3', 'speed_3', 'battery%'], correct: 2, explanation: 'speed_3 uses only letters, a number and an underscore, and does not start with a number. 3speed starts with a number, speed 3 has a space and % is an operator.' },

      { type: 'text', md: `## 4. Data types
Every value has a type. The type tells Python what kind of value it is and what it can do with it.
- **int**: whole numbers, such as 0, 10, -5. For counting rotations and motor speed levels.
- **float**: numbers with a decimal point, such as 3.14 and 100.0. For distance, time and sensor readings.
- **bool**: only True or False. Is the button pressed? Is an object detected?
- **str**: text in quotation marks, such as "Motor A". For messages and names.

Ask Python with type():
\`\`\`
print(type(12))        # <class 'int'>
print(type(45.5))      # <class 'float'>
print(type(False))     # <class 'bool'>
print(type("Motor A")) # <class 'str'>
print(type("25"))      # <class 'str'>, the quotes make it text
\`\`\`
True and False need a capital letter and no quotation marks.

### Activity 5.3: record the mission (pairs, 10 minutes)
Make a new file called mission.py:
1. **mission_duration_minutes**: how long the robot has worked, for example 120.
2. **current_power_level_percent**: battery left, for example 78.5.
3. **is_operational**: True or False.
4. Agree with your partner the data type of each one, and why.
5. Print all three with labels.` },
      { type: 'check', question: 'What is the data type of 45.0?', options: ['int', 'float', 'bool', 'str'], correct: 1, explanation: '45.0 has a decimal point, so it is a float, even though the decimal part is 0.' },

      { type: 'text', md: `## 5. Operations
Python's maths operators:
- \`+\` add: \`5 + 3\` gives 8
- \`-\` subtract: \`10 - 2\` gives 8
- \`*\` multiply: \`4 * 2\` gives 8
- \`/\` divide, always a decimal: \`10 / 2\` gives 5.0
- \`//\` integer divide, the whole part only: \`10 // 3\` gives 3
- \`%\` modulo, the remainder: \`10 % 3\` gives 1
- \`**\` power: \`2 ** 3\` gives 8` },
      { type: 'image', url: `${T}/fig56_sample_operations.jpg`, caption: 'Figure 5.6: sample Python operations (Robotics for SHS Year 3)', alt: 'Python results for 5+10, 10/3, 10//3, "ab"+"cd" and an error for 7+"ab"' },
      { type: 'text', md: `What Figure 5.6 shows:
- 10 / 3 gives 3.3333333333333335. Computers store decimals approximately, so the last digit looks odd. It is not wrong.
- "ab" + "cd" gives abcd: + joins text.
- 7 + "ab" gives a **TypeError**: you cannot add a number to text. Use print(7, "ab") to show both.

### Activity 5.4: robot performance (pairs, 15 minutes)
The robot uses 0.5% of its power every minute. Add to mission.py:
1. **power_used**: how much power the mission has used.
2. **time_left**: how many more minutes before the battery is empty.
3. Print both with good labels.
4. Extra: show time_left in hours and minutes using // and %.

Hint from the book:
\`\`\`
power_used = mission_duration_minutes * 0.5
time_left = current_power_level_percent / 0.5
\`\`\`` },
      { type: 'link', label: 'Try Activities 5.3 and 5.4 in Python practice', url: '/python?example=mission' },
      { type: 'check', question: 'What are 17 // 5 and 17 % 5?', options: ['3.4 and 2', '3 and 2', '3 and 4', '2 and 3'], correct: 1, explanation: '17 // 5 is 3 (5 goes into 17 three whole times) and 17 % 5 is 2 (the remainder).' },

      { type: 'text', md: `## Summary
- Variables store robot data: name = value.
- Names follow rules: letters, numbers and _, no spaces, not Python's own words.
- Every value has a type: int, float, bool or str.
- Operators calculate: \`+ - * / // % **\`

**Homework:** write status.py for your robot. Store its name, its speed in cm per second, the distance travelled and whether it is charging. Work out how long it takes to travel 200 cm at its speed, and print everything with labels. Read pages 90 to 92 (Lists) for next lesson.` },
    ],
  },
];
