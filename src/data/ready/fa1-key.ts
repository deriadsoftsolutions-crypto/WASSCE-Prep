/**
 * STEM 3, unit 3.3.2: the Teacher Manual's key assessment for Section 5, Focal Area 1
 * (DoK 3 written task and DoK 4 practical). Set after the Lists lesson (Python 2).
 */
import { build, short, type ReadyAssignment, type ReadyTest } from './types';

const keyWrittenQs = build([
  short('Data Management Strategy for a Humanitarian Robot\nA newly designed robotic system delivers medical supplies to remote villages in Ghana during emergencies. It must log its route points, track its payload status and record any environmental anomalies (e.g. unexpected rainfall, rough terrain).\n\n(a) Justify the transition from block-based programming to Python for this humanitarian robot. Give at least two distinct reasons directly relevant to the complexity or requirements of such a robot. (4 marks)',
    'Rubric (Teacher Manual): Justification for Python, 2 marks: two distinct, well-reasoned justifications. Linking to Python\'s capabilities, 2 marks: links scalability, control, integration and debugging to the robot\'s complex needs.\nExamples: many route points and events need a scalable program; precise control of payload and hatch; integration with GPS, weather and map libraries; clear error messages and debugging tools for a robot that must not fail in an emergency.', 4),
  short('(b) Propose a Python variable and data type strategy for storing:\ni. Robot identification number (e.g. "DRONE-GH-001")\nii. Current payload weight (in kilograms, which might not be a whole number)\niii. The total number of successful deliveries made\niv. A status showing if its main delivery hatch is open or closed\nv. A list of the last three critical events during a mission (e.g. "Heavy Rainfall Detected", "Path Obstruction", "Low Battery Warning")\nFor each, state the most appropriate data type and justify your choice.',
    'Rubric (Teacher Manual): Data strategy and justification, 10 marks: 5 marks for correct data types for all five items, 5 marks for clear, logical justifications.\ni. str: text identifier, not used in calculations.\nii. float: weight can have decimals.\niii. int: whole count of deliveries.\niv. bool: only open or closed (True/False).\nv. list (of str): an ordered collection that can grow and be updated, e.g. last_three_critical_events = ["Heavy Rainfall Detected", "Path Obstruction", "Low Battery Warning"].', 10),
  short('(c) Explain how Python\'s list data structure would be advantageous for managing last_three_critical_events compared to storing each event in a separate, individual variable. Give at least three points.',
    'Rubric (Teacher Manual): Advantage of lists, 6 marks: at least 3 well-explained points, 2 marks each.\nPoints: a list keeps events in order (first to last); its size can change (append new events, remove old ones with pop) without new variable names; it can be looped over or printed in one step; all events are grouped under one name, so the program is shorter and easier to read and fix; individual items can still be reached by index, e.g. events[0] or events[-1].', 6),
]);

export const keyWritten: ReadyTest = {
    key: 'python-key-written',
    lessonKey: 'python-2',
    year: 3,
    unitId: 'u3-3-2',
    title: 'Key assessment (Teacher Manual): data management strategy for a humanitarian robot',
    when: 'Teacher Manual, Section 5, Focal Area 1, DoK level 3. 20 marks, written answers you mark with the manual\'s rubric. Set after the Lists lesson.',
    instructions: 'Teacher Manual key assessment, Section 5, Focal Area 1 (DoK level 3: short answers and extended response).\nWrite full answers in your own words. Give reasons, not just names.\nMarks: (a) 4, (b) 10, (c) 6. Total 20.',
    timeLimitMin: 0,
    showResults: 'teacher',
    portfolioSection: 'tests',
    ...keyWrittenQs,
  };

export const keyPractical: ReadyAssignment = {
    key: 'python-key-practical',
    lessonKey: 'python-2',
    year: 3,
    unitId: 'u3-3-2',
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
  };
