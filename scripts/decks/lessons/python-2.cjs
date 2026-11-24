// Python 2: lists and the robot status report (STEM 3, unit 3.3.2, Section 5 Focal Area 1). Book pages 90 to 93.
const path = require('path');

module.exports = {
  file: 'Python-2-Lists-and-Status-Report.pptx',
  title: 'Python 2 slides: lists and the robot status report',
  footer: 'STEM 3 Robotics  |  Python 2: lists and the robot status report',
  build({ L }, { images }) {
    const img = (f) => path.join(images, f);

    L.title({
      title: 'Python for robots 2: lists and the robot status report',
      subtitle: 'STEM 3 Robotics  |  Section 5: Robot Programming  |  Double period (2 hours)',
      iconName: 'list',
      notes: 'Today learners stop storing one value per variable and keep many values together in a list, the way a robot logs its moves and readings. They finish the Teacher Manual\'s status report task (requirements 4 and 5). Book: Robotics for SHS Year 3, Section 5, pages 90 to 93. Teacher Manual Year 3, Section 5, Focal Area 1 (Lists, Task Requirements 4 and 5). Learners need their mission.py from Python 1.',
    });
    L.plan({
      objectives: ['Create a list and read items by index', 'Change a list: append, insert, remove, pop', 'Use len() and negative indexes like [-1]', 'Build the complete robot status report', 'Fix IndexError, NameError, TypeError, SyntaxError'],
      plan: [['0:00', 'Recap and starter', '10 min'], ['0:10', 'What is a list?', '15 min'], ['0:25', 'Index, len and negative index', '15 min'], ['0:40', 'Changing a list', '20 min'], ['1:00', 'Activity 5.5: activity log', '15 min'], ['1:15', 'Activity 5.6: status report', '25 min'], ['1:40', 'Activity 5.7, exit check, summary', '20 min']],
      notes: 'Read the objectives aloud. Three coding tasks today, all from the learner book: Activities 5.5, 5.6 and 5.7. Activity 5.6 is the Teacher Manual task: by the end every learner should have a working status reporter.',
    });
    L.code({
      title: 'Recap: one box, one value',
      label: 'mission.py (from Python 1)', fontSize: 17,
      code: 'move1 = "forward 10cm"\nmove2 = "turn 90deg"\nmove3 = "stop"\n# ...and move4, move5, move6?\nprint(move1, move2, move3)',
      points: ['Python 1: each variable held ONE value', 'A robot does hundreds of moves and readings', 'A variable for each one is slow and easy to get wrong', 'We need one box that holds many values in order'],
      tip: 'Starter: how would you store every move a line follower makes in 5 minutes?',
      notes: 'Starter (5 min). Show the code. Ask: how many variables would a robot need to record 100 moves? What if it does not know how many moves there will be? Lead to the idea of one container that grows. Quick recap questions from Python 1: what is type(45.0)? What does = do?',
    });

    L.divider({ title: 'Lists', sub: 'Many values in one place, in order  |  30 minutes', notes: 'Transition: in SPIKE Prime you already used a list block. Python lists do the same job.' });
    L.figure({
      title: 'A list is a basket of values',
      image: img('fig57.jpg'), imageSize: [1356, 363], alt: 'Figure 5.7 a movement log as a list in blocks and in Python',
      caption: 'Figure 5.7, Robotics for SHS Year 3: a movement log in blocks and in Python',
      heading: 'Key features',
      points: ['Ordered: items keep their position', 'Changeable: add, remove or change items', 'Flexible: numbers, text, or both', 'Square brackets [ ], commas between items'],
      tagline: 'One name, many values.',
      prompt: 'Name three things a robot could keep in a list.',
      notes: 'Book page 90 to 91. Answers to the prompt: movement log, sensor readings over time (light_readings = [50, 52, 48, 55, 60]), robot state (robot_state = [10, 20, "moving forward", 75.5]), list of deliveries, list of faults. Point out the list block in SPIKE Prime from Year 1.',
    });
    L.code({
      title: 'Creating lists',
      label: 'lists.py', fontSize: 16,
      code: 'movement_log = ["forward 10cm", "turn 90deg", "stop"]\nlight_readings = [50, 52, 48, 55, 60]\nrobot_state = [10, 20, "moving forward", 75.5]\n\nprint(movement_log)\nprint(light_readings)',
      output: "['forward 10cm', 'turn 90deg', 'stop']\n[50, 52, 48, 55, 60]",
      points: ['Text items need quotation marks', 'Numbers do not', 'One list can mix types (robot_state)', 'Python prints a list with its brackets'],
      notes: 'Type this live in VS Code (file 07_lists.py in the starter files). Common mistakes to show on purpose: a missing comma (SyntaxError) and a missing closing bracket. The book has robot_state = [10,20,"moving forward",75.5 with the closing bracket missing: ask learners to spot the error.',
    });
    L.code({
      title: 'Reading items: the index',
      label: 'index.py', fontSize: 18,
      code: 'log = ["forward 10cm", "turn 90deg", "stop"]\nprint(log[0])\nprint(log[2])\nprint(log[-1])\nprint(len(log))',
      output: 'forward 10cm\nstop\nstop\n3',
      steps: [['Count from 0', 'log[0] is the FIRST item'], ['Negative counts from the end', 'log[-1] is the LAST item'], ['len() counts the items', 'len(log) gives 3']],
      tip: 'log[3] does not exist: IndexError: list index out of range.',
      notes: 'Draw three boxes on the board labelled 0, 1, 2 (and -3, -2, -1 underneath). Most common misconception: the first item is [1]. Ask: what is the last index of a list with 10 items? (9, or -1.)',
    });

    L.divider({ title: 'Changing a list', sub: 'append, insert, remove, pop  |  20 minutes', notes: 'Transition: a robot\'s log grows as it works. Lists can change while the program runs.' });
    L.table({
      title: 'Common things you can do with lists',
      head: ['Action', 'Function', 'Example'], colW: [2.6, 1.7, 3.0], mono: [1, 2],
      rows: [['Add to the end', 'append()', 'log.append("stop")'], ['Insert at a position', 'insert()', 'log.insert(1, "turn")'], ['Remove by value', 'remove()', 'log.remove("left")'], ['Remove by position', 'pop()', 'log.pop(0)'], ['Change an item', '[ ] =', 'readings[2] = 49'], ['Count items', 'len()', 'len(log)']],
      side: { heading: 'Robot example', code: 'log = []\nlog.append("forward")\nlog.append("turn")\nprint(len(log))', label: 'grow.py', text: 'Start with an empty list [ ] and append each move as the robot makes it.' },
      notes: 'Book page 91. pop() with no number removes the LAST item and gives it back, which is useful for "undo the last move". remove() deletes the first item with that value; if the value is not there, Python raises ValueError.',
    });
    L.code({
      title: 'Predict, then run',
      label: '07_lists.py', fontSize: 16,
      code: 'log = ["forward 10cm", "turn 90deg", "stop"]\nlog.append("reverse 5cm")\nlog.insert(1, "wait 2s")\nprint(log)\nlog.remove("stop")\nprint(log.pop())\nprint(log)',
      output: "['forward 10cm', 'wait 2s', 'turn 90deg', 'stop', 'reverse 5cm']\nreverse 5cm\n['forward 10cm', 'wait 2s', 'turn 90deg']",
      points: ['Pairs write their prediction for each print line first', 'Then run and compare', 'Explain any surprise to your partner'],
      notes: 'Learners predict on paper before running. The usual surprise is insert(1, ...) pushing the other items along, and pop() printing the removed item.',
    });
    L.activity({
      title: 'Try it: logging robot actions (Activity 5.5)',
      intro: 'New file: activity_log.py',
      tasks: ['Create a list called recent_activities', 'Store five actions your robot did today', 'Print all the activities', 'Print only the first and last activity using indexing', 'Extra: append a sixth, print len()'],
      timer: '15 minutes, in pairs',
      code: 'recent_activities = [\n    "Scanned crops",\n    "Uploaded data",\n    "Charged battery",\n    "Avoided obstacle",\n    "Sent report to HQ",\n]\nprint("Activities:", recent_activities)\nprint("First:", recent_activities[0])\nprint("Last:", recent_activities[-1])',
      label: 'activity_log.py  (example)', codeSize: 13,
      output: "Activities: ['Scanned crops', 'Uploaded data', ...]\nFirst: Scanned crops\nLast: Sent report to HQ",
      notes: 'Activity 5.5, book page 92. Show the example only after 8 minutes, or give 08_activity_log.py to learners who need support. Check that learners use [0] and [-1] (or [4]), not the text itself.',
    });

    L.divider({ title: 'The status report', sub: 'Putting Python 1 and Python 2 together  |  25 minutes', notes: 'Transition: this is the Teacher Manual\'s learning task. Everything learners have done so far goes into one program.' });
    L.activity({
      title: 'Try it: the status report (Activity 5.6)',
      intro: 'Copy in your mission.py work, add your list, then print:',
      tasks: ['A title: === ROBOT SYSTEM DAILY STATUS REPORT ===', 'Robot ID and purpose', 'Mission time and power level', 'Is the robot operational?', 'Power used and time left', 'All activities, then the first and last'],
      timer: '25 minutes, in pairs',
      code: 'print("=== ROBOT SYSTEM DAILY STATUS REPORT ===")\nprint(f"Robot ID: {robot_id}")\nprint(f"Purpose: {system_purpose}")\nprint(f"Power used: {power_used} %")\nprint(f"Time left: {time_left} minutes")\nprint("Activities:", recent_activities)\nprint("First activity:", recent_activities[0])',
      label: 'status_report.py  (part of an answer)', codeSize: 13,
      footnote: 'Challenge: f-strings put values straight into text: f"Robot ID: {robot_id}"',
      notes: 'Activity 5.6, book page 92 to 93; Teacher Manual Task Requirements 4 and 5. Support: give 09_status_report.py, which lists the order. Stretch: f-strings, and time left in hours and minutes. Learners can hand in through Python practice (Hand in) or upload from VS Code for the Python 2 practical assignment.',
    });
    L.rows({
      title: 'Activity 5.7: debug and review',
      rows: [
        { icon: 'bug', head: 'SyntaxError', text: 'A missing bracket, quotation mark or comma. Look at the line above the one Python points to, too.', color: 'red' },
        { icon: 'bug', head: 'NameError', text: 'A name is misspelt or used before it is created: recent_activity instead of recent_activities.', color: 'red' },
        { icon: 'bug', head: 'TypeError', text: 'Types that cannot work together: 7 + "ab". Use a comma in print or str().', color: 'red' },
        { icon: 'bug', head: 'IndexError', text: 'A list position that does not exist: log[5] in a list of 5 items.', color: 'red' },
      ],
      notes: 'Activity 5.7, book page 93 (10 min). Learners run their report, read the last line of any error, fix one thing at a time, then help a classmate. Finish with think-pair-share: easiest part, hardest part, compare how partners built the log.',
    });

    L.divider({ title: 'Wrap up', sub: 'Exit check and summary  |  10 minutes' });
    L.quiz({
      questions: [
        'readings = [50, 52, 48, 55, 60]. What is readings[1]?',
        'What is the index of the LAST item in a list of 8 items? Give two answers.',
        'log = ["a", "b"]. After log.append("c") and log.insert(0, "z"), what is log?',
        'Which method removes an item by its position?',
        'items = ["scan", "move", "stop"]. What does items[3] cause?',
      ],
      notes: 'Answers: 1) 52. 2) 7, or -1. 3) ["z", "a", "b", "c"]. 4) pop(). 5) IndexError. The ready-made test "Python 2 check: lists" and the practical "Python 2 practical: the complete robot status report" are on the Teacher page. The Teacher Manual key assessment for Focal Area 1 can now be set too.',
    });
    L.summary({
      points: ['A list keeps many values in order', 'Positions start at 0; [-1] is the last', 'append, insert, remove, pop change it', 'Read the last line of an error first'],
      homework: 'add a list called sensor_readings with ten temperatures to your status report; print the first, the last and how many there are. Read pages 93 to 97 (if, elif and else).',
      notes: 'Next lesson: Python 3, making decisions with if, elif and else.',
    });
  },
};
