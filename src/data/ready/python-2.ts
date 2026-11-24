/** STEM 3, unit 3.3.2 (Section 5, Focal Area 1): Python 2, lists and the robot status report. */
import { build, mcq, num, short, type ReadyAssignment, type ReadyLesson, type ReadyTest } from './types';

const T = '/teaching/python-2';
const DECK = `${T}/Python-2-Lists-and-Status-Report.pptx`;

export const lesson: ReadyLesson = {
  key: 'python-2',
  title: 'Python for robots 2: lists and the robot status report',
  summary: 'Keep many values in one list, change it with append, insert, remove and pop, and build the robot status report. Double period (2 hours) in VS Code.',
  year: 3,
  unitId: 'u3-3-2',
  topicId: 6,
  materials: [
    { unitId: 'u3-3-2', year: 3, title: 'Python 2 slides: lists and the robot status report', description: 'PowerPoint', kind: 'file', url: DECK, fileName: 'Python-2-Lists-and-Status-Report.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', audience: 'learners', published: true },
    { unitId: 'u3-3-2', year: 3, title: 'Python 2 starter files for VS Code', description: 'Unzip, then File > Open Folder in VS Code', kind: 'file', url: `${T}/python-2-starter-files.zip`, fileName: 'python-2-starter-files.zip', mime: 'application/zip', audience: 'learners', published: true },
  ],
  blocks: [
    { type: 'text', md: `# Today's mission
Last lesson each variable held one value. A robot often needs many: every move it made, every sensor reading, every job done today. Today you keep them together in a **list**, and finish the robot status report from the Teacher Manual.

By the end you will be able to:
- create a list and read items by their position (index)
- add, insert, remove and change items with \`append()\`, \`insert()\`, \`remove()\` and \`pop()\`
- use \`len()\` and negative indexes such as \`[-1]\`
- build a complete, labelled robot status report
- find and fix IndexError, NameError, TypeError and SyntaxError

**You need:** your mission.py from Python 1, VS Code (or Python practice on this site). Book: Robotics for SHS Year 3, Section 5, pages 90 to 93.` },
    { type: 'link', label: 'View the slides', url: DECK },
    { type: 'link', label: 'Download the VS Code starter files (.zip)', url: `${T}/python-2-starter-files.zip` },
    { type: 'link', label: 'No VS Code? Open Python practice', url: '/python?example=lists' },

    { type: 'text', md: `## 1. What is a list?
A **list** stores many values in one place, like a basket holding several items. In Python you write the items inside square brackets, separated by commas.
\`\`\`
movement_log = ["forward 10cm", "turn 90deg", "stop"]
light_readings = [50, 52, 48, 55, 60]
robot_state = [10, 20, "moving forward", 75.5]
\`\`\`
Lists are:
- **Ordered:** items keep their position (first, second, third...).
- **Changeable:** you can add, remove or change items.
- **Flexible:** one list can hold numbers, text, or both.

In SPIKE Prime you used a list block for the same job.` },
    { type: 'image', url: `${T}/fig57_movement_log.jpg`, caption: 'Figure 5.7: a movement log as a list in blocks and in Python (Robotics for SHS Year 3)', alt: 'A SPIKE list block with three moves next to movement_log = ["forward 10cm", "turn 90deg", "stop"]' },

    { type: 'text', md: `## 2. Reading items: the index
Each item has a position number called its **index**. Python counts from **0**.
\`\`\`
movement_log = ["forward 10cm", "turn 90deg", "stop"]
print(movement_log[0])    # forward 10cm
print(movement_log[2])    # stop
print(movement_log[-1])   # stop (-1 is always the last item)
print(len(movement_log))  # 3 items
\`\`\`
Asking for an index that does not exist, such as \`movement_log[3]\`, stops the program with **IndexError: list index out of range**.` },
    { type: 'check', question: 'readings = [50, 52, 48, 55, 60]\nWhat does print(readings[1]) show?', options: ['50', '52', '48', '60'], correct: 1, explanation: 'Python counts from 0, so index 1 is the second item, 52.' },

    { type: 'text', md: `## 3. Changing a list
| What you want | How | Example |
|---|---|---|
| Add to the end | \`append()\` | \`log.append("stop")\` |
| Add at a position | \`insert()\` | \`log.insert(1, "turn")\` |
| Remove by value | \`remove()\` | \`log.remove("left")\` |
| Remove by position | \`pop()\` | \`log.pop(0)\` removes the first item; \`log.pop()\` the last |
| Change an item | \`[index] =\` | \`readings[2] = 49\` |
| Count the items | \`len()\` | \`len(log)\` |

Try it, predicting each line first:
\`\`\`
log = ["forward 10cm", "turn 90deg", "stop"]
log.append("reverse 5cm")
log.insert(1, "wait 2s")
print(log)   # ['forward 10cm', 'wait 2s', 'turn 90deg', 'stop', 'reverse 5cm']
log.remove("stop")
print(log.pop())   # reverse 5cm
\`\`\`` },
    { type: 'check', question: 'log = ["a", "b"]\nlog.append("c")\nlog.insert(0, "z")\nWhat is log now?', options: ['["a", "b", "c", "z"]', '["z", "a", "b", "c"]', '["z", "b", "c"]', '["a", "z", "b", "c"]'], correct: 1, explanation: 'append adds "c" to the end; insert(0, "z") puts "z" at the front.' },
    { type: 'link', label: 'Try the list examples in Python practice', url: '/python?example=lists' },

    { type: 'text', md: `### Activity 5.5: logging robot actions (pairs, 15 minutes)
1. Create a list called **recent_activities**.
2. Store five actions your robot did today, for example "Scanned crops", "Uploaded data", "Charged battery", "Avoided obstacle", "Sent report to HQ".
3. Print all the activities.
4. Print only the **first** and the **last** activity using indexing.
5. Extra: add a sixth action with \`append()\`, then print how many there are with \`len()\`.` },
    { type: 'link', label: 'Activity 5.5 in Python practice', url: '/python?example=activity-log' },

    { type: 'text', md: `## 4. Activity 5.6: the robot status report (pairs, 25 minutes)
Combine everything from Python 1 and today into one report. Print, in this order:
1. A title: **=== ROBOT SYSTEM DAILY STATUS REPORT ===**
2. The robot ID and purpose
3. Mission duration and power level
4. Whether the robot is operational
5. Power used and time left
6. The full list of activities
7. The first and last activities

**Challenge:** f-strings put values straight into text:
\`\`\`
print(f"Robot ID: {robot_id}")
print(f"Time left: {time_left} minutes")
\`\`\`` },
    { type: 'link', label: 'Activity 5.6 in Python practice', url: '/python?example=status-report' },

    { type: 'text', md: `## 5. Activity 5.7: debug and review (10 minutes)
Run your program. If Python stops with an error, read the **last line** of the message first:
- **SyntaxError:** a missing bracket, quotation mark or comma.
- **NameError:** a name is misspelt or used before it is created.
- **TypeError:** two types that cannot work together, such as \`7 + "ab"\`.
- **IndexError:** a list position that does not exist.

Fix one thing, run again. When yours works, help a classmate.

**Think, pair, share:** what was easiest today? What was hardest? Compare how you and your partner built the activity log.` },
    { type: 'check', question: 'items = ["scan", "move", "stop"]\nWhich line causes an IndexError?', options: ['print(items[0])', 'print(items[-1])', 'print(items[3])', 'print(len(items))'], correct: 2, explanation: 'There are 3 items, at positions 0, 1 and 2. Position 3 does not exist.' },

    { type: 'text', md: `## Summary
- A list keeps many values in order: \`name = [item, item, item]\`.
- Positions start at 0; \`[-1]\` is the last item; \`len()\` counts the items.
- \`append()\`, \`insert()\`, \`remove()\` and \`pop()\` change a list.
- Read the last line of an error first.

**Homework:** add a list called **sensor_readings** with ten temperature readings to your status report. Print the first, the last and how many there are. Read pages 93 to 97 (if, elif and else) for next lesson.` },
  ],
};

const check = build([
  mcq('Which line creates a list correctly?', ['moves = (forward, back)', 'moves = ["forward", "back"]', 'moves = "forward", "back"', 'moves = [forward back]'], 1, 'A list uses square brackets, with text items in quotation marks and commas between items.'),
  mcq('readings = [50, 52, 48, 55, 60]\nWhat does print(readings[0]) show?', ['52', '50', '0', '60'], 1, 'Python counts positions from 0, so index 0 is the first item.'),
  mcq('readings = [50, 52, 48, 55, 60]\nWhat does print(readings[-1]) show?', ['50', '55', '60', 'An error'], 2, '-1 always means the last item.'),
  num('readings = [50, 52, 48, 55, 60]\nWhat is len(readings)?', 5, 'len() counts the items: there are 5.'),
  mcq('Which method adds an item to the END of a list?', ['insert()', 'pop()', 'append()', 'remove()'], 2, 'append() adds to the end; insert() adds at a chosen position.'),
  mcq('log = ["a", "b", "c"]\nlog.pop(0)\nWhat is log now?', ['["a", "b"]', '["b", "c"]', '["a", "c"]', '["c"]'], 1, 'pop(0) removes the item at position 0, which is "a".'),
  mcq('log = ["start", "stop"]\nlog.insert(1, "turn")\nWhat is log now?', ['["start", "stop", "turn"]', '["turn", "start", "stop"]', '["start", "turn", "stop"]', '["start", "turn"]'], 2, 'insert(1, "turn") puts "turn" at position 1, pushing "stop" along.'),
  mcq('items = ["scan", "move", "stop"]\nWhat happens with print(items[3]) ?', ['It prints stop', 'It prints nothing', 'IndexError: list index out of range', 'NameError'], 2, 'The positions are 0, 1 and 2, so position 3 does not exist.'),
  mcq('Which list mixes two data types?', ['[1, 2, 3]', '["a", "b"]', '[10, "moving forward"]', '[True, False]'], 2, 'It holds an int (10) and a str ("moving forward"). Lists can do this.'),
  num('speeds = [20, 35, 50]\nspeeds.append(65)\nspeeds.remove(20)\nWhat is speeds[0] now?', 35, 'After append the list is [20, 35, 50, 65]; removing 20 leaves [35, 50, 65].'),
  short('A delivery robot logs every route point it passes. Explain THREE advantages of storing the route points in one list instead of in separate variables (point1, point2, point3 ...).',
    '1 mark each for three clear points, up to 3, plus 1 mark for a robot example (4 marks).\nPoints: the points stay in order; the list can grow with append() as the robot moves, with no new variable names; all points can be printed or counted (len) in one step; any point can be reached by its index, e.g. route[0] or route[-1]; the program is shorter and easier to fix.', 4),
  short('Write Python that creates a list called recent_activities with three robot actions, adds a fourth with append(), then prints the first and the last action.',
    'One mark each (4 marks):\nrecent_activities = ["Scanned crops", "Uploaded data", "Charged battery"]\nrecent_activities.append("Sent report to HQ")\nprint(recent_activities[0])\nprint(recent_activities[-1])  (or [3])', 4),
]);

export const test: ReadyTest = {
  key: 'python-2-check',
  year: 3,
  unitId: 'u3-3-2',
  title: 'Python 2 check: lists',
  when: 'Straight after the Python 2 lesson. 10 auto-marked questions and 2 written answers you mark (18 marks, 30 minutes).',
  instructions: 'Answer every question on your own.\nQuestions 1 to 10 are marked automatically.\nQuestions 11 and 12 are written answers your teacher will mark.\nYou may not use VS Code or the Python practice page during this test.',
  timeLimitMin: 30,
  showResults: 'teacher',
  portfolioSection: 'tests',
  ...check,
};

export const practical: ReadyAssignment = {
  key: 'python-2-report',
  year: 3,
  unitId: 'u3-3-2',
  title: 'Python 2 practical: the complete robot status report',
  when: 'Straight after the Python 2 lesson. Teacher Manual learning task, requirements 4 and 5 (activity log and full report), 20 marks.',
  maxMarks: 20,
  allowText: true,
  allowFiles: true,
  portfolioSection: 'assignments',
  instructions: `Finish your status_reporter.py from Python 1, or start again. Work on your own.
You can write it in Python practice and press Hand in, or upload your .py file from VS Code with a screenshot of the output.

1. Keep everything from Python 1: robot_id, system_purpose, mission_duration_minutes, current_power_level_percent, is_operational, total_power_consumed_percent and estimated_remaining_operating_minutes.

2. Activity log
- A list called recent_activities with your robot's last five actions, in order
- Print the whole list
- Print only the first and the last activity, each on its own line

3. The report
- Start with the title ROBOT SYSTEM DAILY STATUS REPORT
- Print every value with a clear label, in a sensible order, easy to read
- The program runs without errors

Marking (20 marks)
- Variables from Python 1, correct types (4)
- Calculations correct (2)
- recent_activities list with five actions, correct syntax (3)
- Whole list printed (2)
- First and last activities printed using indexes (3)
- Report title and clear labels (3)
- Well organised and easy to read (2)
- Runs without errors (1)

Extra challenge (not marked): use f-strings, and add the time left in hours and minutes.`,
};
