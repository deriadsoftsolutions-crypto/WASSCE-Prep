// Python 3: making decisions with if, elif and else (STEM 3, unit 3.3.2, Section 5 Focal Area 2). Book pages 93 to 97.
const path = require('path');

module.exports = {
  file: 'Python-3-Making-Decisions.pptx',
  title: 'Python 3 slides: making decisions with if, elif and else',
  footer: 'STEM 3 Robotics  |  Python 3: making decisions',
  build({ L }, { images }) {
    const img = (f) => path.join(images, f);

    L.title({
      title: 'Python for robots 3: making decisions with if, elif and else',
      subtitle: 'STEM 3 Robotics  |  Section 5: Robot Programming  |  Double period (2 hours)',
      iconName: 'branch',
      notes: 'Focal Area 2 begins: control flow. Today covers decisions (conditional statements); next lesson covers loops. Book: Robotics for SHS Year 3, Section 5, pages 93 to 97. Teacher Manual Year 3, Section 5, Focal Area 2. Recap links: Year 1 Week 5 (logic and loop diagrams), Weeks 21 to 23 (programs from flowcharts with single and nested decisions), Year 2 Week 9 (Boolean algebra).',
    });
    L.plan({
      objectives: ['Write conditions with == != < > <= >=', 'Use if, if-else and if-elif-else', 'Combine conditions with and, or, not', 'Nest one decision inside another', 'Read numbers with float(input())'],
      plan: [['0:00', 'Activity 5.8: control flow recap', '15 min'], ['0:15', 'Conditions: True or False', '15 min'], ['0:30', 'if and if-else', '20 min'], ['0:50', 'if-elif-else', '15 min'], ['1:05', 'and, or, not; nested decisions', '20 min'], ['1:25', 'Activity 5.9: temperature robot', '20 min'], ['1:45', 'Exit check and summary', '15 min']],
      notes: 'Read the objectives aloud. The book\'s two activities are 5.8 (recap table) and 5.9 (temperature-based movement). The practical assignment extends Activity 5.9 with nested decisions.',
    });
    L.table({
      title: 'Activity 5.8: control flow recap',
      head: ['Term', 'Purpose', 'Robot example'], colW: [1.4, 2.9, 3.0], mono: [0],
      rows: [['if', 'Do something only when a condition is true', 'If the robot sees an obstacle, it turns left'], ['else', '', ''], ['else if', '', ''], ['for', '', ''], ['while', '', ''], ['break', '', ''], ['continue', '', '']],
      side: { heading: 'In groups of 2 or 3', text: 'Copy the table and fill in each purpose and a robot example. Use your Year 1 flowcharts to help.\n\nToday: if, else, else if.\nNext lesson: for, while, break, continue.' },
      notes: 'Activity 5.8, book page 94 to 95 (10 to 15 min). Model answers: else: do something when the condition is false (if no obstacle, keep going). else if: check another condition when the first is false (if light is yellow, slow down). for: repeat a set number of times (move forward 10 times). while: repeat while a condition is true (keep moving while no obstacle). break: stop a loop early (stop scanning when the target is found). continue: skip to the next repeat (skip a faulty reading). Collect a few answers on the board.',
    });

    L.divider({ title: 'Conditions', sub: 'Questions with a True or False answer  |  15 minutes', notes: 'Transition: every decision starts with a question. In Python the question is a condition and the answer is True or False, the bool type from Python 1.' });
    L.table({
      title: 'Comparison operators (battery_level = 15)',
      head: ['Symbol', 'Means', 'Example', 'Result'], colW: [1.0, 2.1, 3.1, 1.1], mono: [0, 2],
      rows: [['==', 'is equal to', 'battery_level == 15', 'True'], ['!=', 'is not equal to', 'battery_level != 15', 'False'], ['<', 'less than', 'battery_level < 20', 'True'], ['>', 'greater than', 'battery_level > 50', 'False'], ['<=', 'less than or equal to', 'battery_level <= 15', 'True'], ['>=', 'greater than or equal to', 'battery_level >= 20', 'False']],
      side: { heading: 'One = or two?', code: 'speed = 50       # store\nprint(speed == 50)  # ask', label: 'equals.py', text: 'One = stores a value. Two == ask a question and give True or False.' },
      notes: 'Run the first lines of 10_conditions.py. The = versus == mix-up is the most common mistake: writing if speed = 50: gives a SyntaxError. Quick oral check: is 20 <= 20 True? Is "20" == 20 True? (No: text is not a number.)',
    });

    L.divider({ title: 'if, else, elif', sub: 'Choosing what the robot does  |  35 minutes', notes: 'Transition: in Year 1 you used If blocks. Python writes the same logic as text.' });
    L.figure({
      title: 'Simple if',
      image: img('fig58.jpg'), imageSize: [1263, 279], alt: 'Figure 5.8 a simple if in blocks and in Python',
      caption: 'Figure 5.8, Robotics for SHS Year 3: a simple if in blocks and Python',
      heading: 'Two new rules',
      points: ['The if line ends with a colon :', 'Lines inside the if are indented 4 spaces (Tab)', 'If the condition is False, those lines are skipped', 'Blocks did this for you; now you type it'],
      prompt: 'What does the robot do when battery_level is 80?',
      notes: 'Book page 95 to 96. Answer to the prompt: nothing; the condition is False so the print is skipped. Live code: type the if without the colon and run it to show the SyntaxError, then remove the indentation to show IndentationError.',
    });
    L.figure({
      title: 'if-else: two possible outcomes',
      image: img('fig59.jpg'), imageSize: [855, 312], alt: 'Figure 5.9 if-else in blocks and in Python',
      caption: 'Figure 5.9: if-else in blocks and Python',
      heading: 'Reading it aloud',
      points: ['If there is an obstacle, turn left', 'Otherwise, keep going', 'else has no condition of its own', 'else also ends with a colon'],
      tagline: 'Exactly one of the two branches runs.',
      prompt: 'is_obstacle == True can be shortened to just is_obstacle. Why?',
      notes: 'Book page 96. Answer: is_obstacle is already True or False, so comparing it with True adds nothing. Run 10_conditions.py and change is_obstacle to False.',
    });
    L.code({
      title: 'if-elif-else: several choices',
      label: '11_traffic_light.py', fontSize: 18,
      code: 'traffic_light = "yellow"\n\nif traffic_light == "green":\n    print("Go")\nelif traffic_light == "yellow":\n    print("Slow down")\nelse:\n    print("Stop")',
      output: 'Slow down',
      steps: [['Checks run in order', 'green? no. yellow? yes.'], ['First True branch runs', 'the rest are skipped'], ['else catches everything else', 'red, blue, anything']],
      tip: 'Try "green", "red" and "blue". Why does "blue" print Stop?',
      notes: 'Book page 96. elif is Python\'s short form of "else if". Order matters: only the first true branch runs. Blue prints Stop because no condition matched, so else runs; ask how to add a warning for unknown colours.',
    });

    L.divider({ title: 'Combining and nesting', sub: 'and, or, not; a decision inside a decision  |  20 minutes', notes: 'Transition: real robots check more than one thing at once.' });
    L.cards({
      title: 'and, or, not',
      cards: [
        { icon: 'check', head: 'and', mono: true, sub: 'Both must be True', example: 'battery > 50 and not obstacle', text: 'Move forward only if the battery is good AND the path is clear.' },
        { icon: 'branch', head: 'or', mono: true, sub: 'At least one must be True', example: 'temperature > 35 or smoke', text: 'Raise the alarm if it is too hot OR smoke is detected.' },
        { icon: 'stop', head: 'not', mono: true, sub: 'The opposite', example: 'not is_operational', text: 'True when the robot is NOT working: time to send a technician.' },
        { icon: 'chip', head: 'Boolean algebra', sub: 'From Year 2, Week 9', example: 'A AND B,  A OR B,  NOT A', text: 'The same logic as the gates you built: Python just writes it in words.' },
      ],
      notes: 'Link to Year 2 Boolean algebra and the logic gate simulator on the class site (Topic 7). Quick check: battery = 60, obstacle = False; what is battery > 50 and not obstacle? (True.)',
    });
    L.code({
      title: 'Nested decisions',
      label: '12_nested.py', fontSize: 16,
      code: 'battery_level = 60\nobstacle_detected = True\n\nif battery_level > 50:\n    print("Battery level sufficient.")\n    if obstacle_detected:\n        print("Stop and reroute.")\n    else:\n        print("Continue moving forward.")\nelse:\n    print("Battery too low! Return to charging station.")',
      output: 'Battery level sufficient.\nStop and reroute.',
      steps: [['Check the battery first', 'more than 50%?'], ['Then check for an obstacle', 'only if the battery is fine'], ['Indentation shows the levels', '4 spaces, then 8']],
      notes: 'Book page 96 to 97. Trace the code with the class for battery 60 / obstacle True, then battery 30. Tips from the book: use proper indentation; do not nest too deeply; use and / or to shorten. Show the and version at the bottom of 12_nested.py.',
    });

    L.activity({
      title: 'Try it: temperature-based movement (Activity 5.9)',
      intro: 'New file: temperature.py',
      tasks: ['Ask for a temperature with float(input(...))', 'Above 25: Move to cooler area', '18 to 25: Stay in place', 'Below 18: Seek warmer area', 'Test with 30, 25, 18 and 10', 'Challenge: extreme heat above 35'],
      timer: '20 minutes, in pairs',
      code: 'temperature = float(input("Temperature in degrees C: "))\n\nif temperature > 25:\n    print("Move to cooler area")\nelif temperature >= 18:\n    print("Stay in place")\nelse:\n    print("Seek warmer area")',
      label: 'temperature.py  (one answer)', codeSize: 15,
      output: 'Temperature in degrees C: 30\nMove to cooler area',
      footnote: 'input() gives text: float() turns it into a number. In Python practice, type the answer in the Input box.',
      notes: 'Activity 5.9, book page 97. Show the answer only after 10 minutes. Key teaching points: input() returns a str, so 30 > 25 would compare text with a number and fail: use float(). Boundary testing: 25 and 18 must land in "Stay in place". Challenge answer: the > 35 check must come FIRST, otherwise > 25 catches it. The practical assignment builds on this.',
    });
    L.rows({
      title: 'Errors you will meet today',
      rows: [
        { icon: 'bug', head: 'SyntaxError: expected \':\'', text: 'The if, elif or else line is missing its colon.', color: 'red' },
        { icon: 'bug', head: 'SyntaxError with =', text: 'if speed = 50: uses one = where a question needs ==.', color: 'red' },
        { icon: 'bug', head: 'IndentationError', text: 'The lines under an if are not indented, or the indentation is uneven.', color: 'red' },
        { icon: 'bug', head: 'TypeError: \'>\' not supported', text: 'Comparing text from input() with a number: use float(input(...)).', color: 'red' },
      ],
      notes: 'Use while learners work on Activity 5.9. Habit: read the last line of the error, go to the line number, fix one thing, run again.',
    });

    L.divider({ title: 'Wrap up', sub: 'Exit check and summary  |  10 minutes' });
    L.quiz({
      questions: [
        'What is the difference between = and == ?',
        'x = 7. if x > 10: print("A") elif x > 5: print("B") else: print("C"). What is printed?',
        'battery = 60, obstacle = False. Is  battery > 50 and not obstacle  True or False?',
        'Name two things every if line and the lines under it need.',
        'Why do we write float(input(...)) and not just input(...) for a temperature?',
      ],
      notes: 'Answers: 1) = stores a value; == asks whether two values are equal. 2) B. 3) True. 4) A colon at the end; indented lines under it. 5) input() gives text; float() turns it into a number so it can be compared. Ready-made test: "Python 3 check: making decisions". Practical: "Python 3 practical: the robot decision maker".',
    });
    L.summary({
      points: ['Conditions are True or False questions', 'if lines end with a colon; indent the lines under them', 'Only the first true branch runs', 'and, or, not combine conditions'],
      homework: 'write battery_check.py: ask for the battery level and print Full (above 80), Good (50 to 80), Low (20 to 49) or Critical, return to base (below 20). Read pages 97 to 104 (loops).',
      notes: 'Next lesson: Python 4, repeating actions with while and for loops, break and continue.',
    });
  },
};
