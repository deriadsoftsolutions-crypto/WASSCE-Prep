/** STEM 3, unit 3.3.2 (Section 5, Focal Area 1): Python 1, variables, data types and operations. */
import { build, mcq, num, short, type ReadyAssignment, type ReadyLesson, type ReadyTest } from './types';

const T = '/teaching/python-1';

export const lesson: ReadyLesson = {
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
  };

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

export const test: ReadyTest = {
    key: 'python-1-check',
    year: 3,
    unitId: 'u3-3-2',
    title: 'Python 1 check: variables, data types and operations',
    when: 'Straight after the Python 1 lesson. 14 auto-marked questions and 3 written answers you mark (30 marks, 40 minutes).',
    instructions: 'Answer every question on your own.\nQuestions 1 to 14 are marked automatically.\nQuestions 15 to 17 are written answers your teacher will mark.\nYou may not use VS Code or the Python practice page during this test.',
    timeLimitMin: 40,
    showResults: 'teacher',
    portfolioSection: 'tests',
    ...lessonCheck,
  };

export const practical: ReadyAssignment = {
    key: 'python-1-reporter',
    year: 3,
    unitId: 'u3-3-2',
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
  };
