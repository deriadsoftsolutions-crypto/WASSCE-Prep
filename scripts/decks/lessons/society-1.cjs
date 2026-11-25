// Robots and society 1: weighing the good and the bad (STEM 2, unit 2.1.1, Section 1 Week 1, Focal Area 1).
// Learner book Robotics Year 2 pages 8 to 13 and 25; Teacher Manual Year 2 pages 11 to 17.
const path = require('path');

module.exports = {
  file: 'Robots-and-Society-1-Impact-Analysis.pptx',
  title: 'Robots and society 1 slides: weighing the good and the bad',
  footer: 'STEM 2 Robotics  |  Robots and society 1: impact analysis',
  build({ L }, { images }) {
    const img = (f) => path.join(images, f);

    L.title({
      title: 'Robots and society 1: weighing the good and the bad',
      subtitle: 'STEM 2 Robotics  |  Section 1: Robots and Society 2  |  Double period (2 hours)',
      iconName: 'users',
      notes: 'First lesson of Year 2. Section 1, Week 1, Focal Area 1: exploring the broader societal impact of robots. Learner book Robotics Year 2, pages 8 to 13. Teacher Manual Year 2, pages 11 to 17. Learning indicators: (1) analyse and enumerate both the positive and negative impacts of robots on society; (2) explain the need for robot coexistence with humans, taking into consideration safety and roboethics; (3) write publishable articles on ethics, safety and robot coexistence (started as homework today). Recommended assessment mode for Week 1: Group Presentation. Before the lesson: form mixed-ability groups of 3 to 5, print or draw one impact analysis chart per group (the worksheet PDF on the class site), have markers and flip-chart paper ready.',
    });
    L.plan({
      objectives: ['List positive and negative impacts of a robot on society', 'Use the four steps of a societal impact analysis', 'Suggest ways to reduce harm and increase benefit', 'Explain why humans and robots must work together', 'Present a group analysis to the class'],
      plan: [['0:00', 'Starter: robots around us', '10 min'], ['0:10', 'Recap: roboethics and key ideas', '10 min'], ['0:20', 'The four-step impact analysis', '15 min'], ['0:35', 'Worked example: Elli Q', '20 min'], ['0:55', 'Activity 1.1 in groups', '30 min'], ['1:25', 'Group presentations', '15 min'], ['1:40', 'Humans and robots together', '10 min'], ['1:50', 'Exit check and homework', '10 min']],
      notes: 'Read the objectives aloud. Tell learners that today ends with every group presenting a chart, and that the chart and the presentation are marked (the Week 1 group presentation assessment). The homework is a newspaper article (Activity 1.2) built from the same chart, so good notes today make the homework easy.',
    });

    L.divider({ title: 'Robots around us', sub: 'Starter brainstorm  |  10 minutes', notes: 'Transition: activate prior knowledge from Year 1 (Section 1: robots, their benefits and roboethics).' });
    L.cards({
      title: 'Starter: good news or bad news?',
      cards: [
        { icon: 'leaf', head: 'On the farm', sub: 'Drones that spray and map crops', text: 'Who gains? Who could lose out?' },
        { icon: 'medkit', head: 'In the hospital', sub: 'Drones that deliver blood and medicine', text: 'What changes for a patient in a far-away village?' },
        { icon: 'industry', head: 'In the factory', sub: 'Robot arms that weld and pack', text: 'What happens to the people who did that work?' },
        { icon: 'home', head: 'At home and in shops', sub: 'Robot cleaners, self-checkout machines', text: 'What data might these machines collect about you?' },
      ],
      notes: 'Brainstorm (Teacher Manual pedagogical exemplar 1). 3 minutes in pairs, then take answers from around the room. Draw two columns on the board, GOOD and BAD, and write every idea in one of them. Keep the board: you will come back to it. Ghana example: since 2019 medical delivery drones have flown blood and vaccines to health centres in Ghana. Ask: what good does this do? Could anything go wrong? Accept all ideas; the aim is to show that the same robot can bring both good and bad.',
    });
    L.rows({
      title: 'Recap: four key ideas',
      rows: [
        { icon: 'handshake', head: 'Robot-human coexistence', text: 'Robots and people share homes, workplaces and communities safely, with rules robots cannot change themselves.' },
        { icon: 'key', head: 'Roboethics', text: 'Right and wrong in designing and using robots: do no harm, respect privacy, act openly, stay within their role.', color: 'gold' },
        { icon: 'warning', head: 'Safety in robotics', text: 'Standards and procedures that prevent accidents when robots work near people or other machines.', color: 'red' },
        { icon: 'school', head: 'Jobs in robotics', text: 'Robots remove some jobs and create new ones. Next week you will explore robotics careers.' },
      ],
      notes: 'Learner book page 8 (Key Ideas). Year 1 recap: ask one learner to define roboethics in their own words before showing the slide. Point out that today is about weighing the GOOD and the BAD together; in Year 1 most of the focus was on the good.',
    });

    L.divider({ title: 'Societal impact analysis', sub: 'A step-by-step way to think it through  |  35 minutes', notes: 'Transition: designers do not just ask "does the robot work?" They ask "what will the robot do to people and society?"' });
    L.rows({
      title: 'The four steps',
      rows: [
        { icon: 'clipboard', head: '1. Define the scenario and the robot\'s role', text: 'What will the robot do, where, and for whom?' },
        { icon: 'search', head: '2. Identify potential impacts', text: 'Jobs, training, health, environment, education, privacy, safety, fairness, rules.', color: 'gold' },
        { icon: 'tools', head: '3. Reduce the bad, increase the good', text: 'Safety features, secure data, clear rules of use, ways to spread the benefits.' },
        { icon: 'clock', head: '4. Think about the long term', text: 'Will it go out of date quickly? Create e-waste? Can it be upgraded?', color: 'gold' },
      ],
      notes: 'Learner book page 9. Explain each step and why it matters (Teacher Manual exemplar 2). Step 2 questions to read out: Will this robot create new jobs or take jobs away? Will people need new training? Could it improve healthcare, the environment or education? Does it raise privacy, safety or fairness issues? Are there ethical guidelines or rules to follow? Learners copy the four step headings into their notebooks.',
    });
    L.table({
      title: 'Worked example, step 1: Elli Q, a companion robot',
      head: ['Function', 'What Elli Q does'], colW: [2.3, 5.0],
      rows: [['Communication', 'Holds conversations; video calls with family and friends'], ['Daily assistance', 'Reminds about medicine and appointments; turns on lights by voice'], ['Health monitoring', 'Tracks heart rate and sleep; suggests seeing a doctor (not a medical device)'], ['Emotional support', 'Notices the user\'s mood; encourages, plays calming music'], ['Cognitive stimulation', 'Memory games, trivia and learning activities']],
      side: { heading: 'Your turn', text: 'Elli Q helps elderly people who live alone.\n\nWith your partner, pick two functions. For each, write one GOOD and one BAD thing it could cause.\n\n3 minutes.' },
      notes: 'Learner book pages 9 to 10; Teacher Manual exemplar 3 (demonstration). Describe Elli Q, then let learners contribute what step 2 might find before you reveal the next slide. Ghana link: in many Ghanaian families the elderly live with relatives, so ask whether Elli Q would be as useful here, and for whom (for example elderly people whose children work in the city or abroad).',
    });
    L.table({
      title: 'Step 2: Elli Q\'s possible impacts',
      head: ['Positive impacts', 'Possible negative impacts'], colW: [6.05, 6.05],
      rows: [['Elderly people stay independent with help on daily tasks', 'Relying on it too much: less exercise and fewer visits'], ['Health improves with medicine reminders and monitoring', 'Some users struggle with the technology and need training'], ['Games and activities keep the mind healthy', 'Privacy: it records conversations, health data and activity'], ['Less loneliness through calls and emotional support', 'Emotional responses may be wrong or manipulative if badly programmed'], ['Health problems can be spotted early', 'Activities may not suit every person\'s needs or culture']],
      notes: 'Learner book page 10. Compare with what pairs wrote on the previous slide; tick off their ideas as they come up. Stress the habit: for every positive, look for a negative, and the other way round. Link to the starter board.',
    });
    L.table({
      title: 'Steps 3 and 4: reduce the harm, plan for the future',
      head: ['Problem', 'How the designer reduces it'], colW: [2.6, 4.7],
      rows: [['Over-reliance', 'Balanced support: encourage walks, visits and social activities'], ['Technology is hard to use', 'Digital accessibility: simple interface, clear instructions, training'], ['Privacy', 'Data transparency and control: strong security; the user chooses what is collected'], ['Wrong emotional responses', 'Ethical programming: support well-being, never pressure the user'], ['Does not suit everyone', 'Inclusive design: for all backgrounds, abilities and cultures']],
      side: { heading: 'Step 4: long term', text: 'Obsolescence: software upgrades keep it up to date.\n\nE-waste: recycling or refurbishing old models.\n\nCaregivers: Elli Q helps human carers; it does not replace them.' },
      notes: 'Learner book pages 10 to 11. Each mitigation matches a negative from the last slide; ask learners to match them before you reveal the right-hand column. E-waste is a real issue in Ghana (Agbogbloshie in Accra was one of the largest e-waste sites in West Africa): ask what should happen to Elli Q when it stops working.',
    });

    L.divider({ title: 'Activity 1.1', sub: 'Analyse a robot in your group  |  30 + 15 minutes', notes: 'Transition: now each group does the same four steps on a new robot, and presents it.' });
    L.cards({
      title: 'Choose your robot',
      cards: [
        { icon: 'leaf', head: 'Scenario A: AgriBot', sub: 'The agricultural assistant robot', text: 'Plants seeds at the best depth and spacing. Finds weeds with cameras and AI and removes them with little herbicide. Checks soil moisture, nutrients and crop health for precise watering and fertiliser. Can be adapted to harvest some crops.' },
        { icon: 'medkit', head: 'Scenario B: ReNurse', sub: 'The robotic nursing assistant', text: 'Monitors vital signs, medication schedules and patient activity, giving nurses real-time data. Delivers meals, moves patients, helps with mobility exercises. Talks and plays games with patients. Collects patient data to help nurses decide on care.', color: '1F6FB2' },
      ],
      notes: 'Learner book page 12; Teacher Manual Learning Task 1. Groups of 3 to 5, mixed ability. Make sure roughly half the groups take each scenario so the presentations compare both. Learners may state assumptions and add functions (Teacher Manual): for example AgriBot working on a cocoa or maize farm in the Ashanti Region; ReNurse in a district hospital ward.',
    });
    L.activity({
      title: 'Activity 1.1: the impact analysis chart',
      intro: 'In your group (3 to 5):',
      tasks: ['Read your scenario and discuss what the robot does', 'Share: what excites you? What worries you?', 'Fill in every section of the chart', 'Decide who presents which part', 'Present your chart: 3 minutes per group'],
      timer: '30 minutes, then present',
      sheet: {
        heading: 'Impact analysis chart',
        items: [['Robot description', 'What it does and where (agriculture or healthcare)'], ['Positive impacts (at least 3)', 'Jobs, environment, health, well-being'], ['Negative impacts (at least 3)', 'Job loss, privacy, less human contact'], ['Ethical considerations (at least 2)', 'Safety, data security, bias in design'], ['Reducing harm and the long term', 'Safety features, rules, upgrades, e-waste'], ['Human-robot partnership', 'What humans still do, and why it matters']],
      },
      notes: 'Learner book pages 12 to 13; Teacher Manual exemplar 4. Give each group flip-chart paper or the printed chart. Tiered support: sentence starters for groups that struggle ("One benefit for farmers is...", "A risk for patients is...", "To protect privacy, the designer should..."). Stretch for fast groups: who is responsible if the robot makes a mistake that harms someone: the designer, the programmer or the user? Walk round and check every section is filled. At 0:25 into the activity give a 5-minute warning. Presentations: 3 minutes each plus one question from the class; with many groups, let half present now and the rest at the start of the next lesson. Mark with the group presentation rubric (assignment "Robots and society 1: group impact analysis presentation", 20 marks). Groups photograph their chart and upload it.',
    });

    L.divider({ title: 'Humans and robots together', sub: 'Why coexistence matters  |  10 minutes', notes: 'Transition: after the presentations, summarise the common points, then ask: if robots are so capable, why do we still need people?' });
    L.rows({
      title: 'Case study: robotic surgery',
      image: img('surgery-y2.jpg'), imageSize: [900, 1161], alt: 'A surgical robot with three arms next to the surgeon\'s control console',
      caption: 'A surgical robot and the surgeon\'s console',
      rows: [
        { icon: 'robot', head: 'The robot', text: 'Steady, precise, tiny movements through small cuts; no tremor, no tiredness.' },
        { icon: 'hand', head: 'The surgeon', text: 'Sits at the console, controls every arm, decides, handles surprises.', color: 'gold' },
        { icon: 'medkit', head: 'Nurses and doctors', text: 'Prepare, care for and reassure the patient before and after.' },
        { icon: 'handshake', head: 'Together', text: 'Smaller cuts, less pain, faster recovery.', color: 'gold' },
        { icon: 'question', head: 'Discuss', text: 'Would you agree to surgery by the robot alone, with no surgeon? Why or why not?', color: 'red' },
      ],
      notes: 'Teacher Manual exemplar 5 (case study of successful human-robot collaboration); the photo is from the Robotics Year 2 learner book, Section 1. In robot-assisted surgery the surgeon sits at the console and moves the robot arms; the robot filters out hand tremor and makes very small, precise movements through small cuts. The robot never decides on its own. Take two or three answers to the discussion question and draw out: trust, judgement in emergencies, responsibility.',
    });
    L.cards({
      title: 'What each partner brings',
      cards: [
        { icon: 'robot', head: 'Robots', sub: 'Strengths', text: 'Speed, precision, strength, no tiredness, safe in dangerous places, follow instructions exactly.' },
        { icon: 'lightbulb', head: 'Creativity and problem-solving', sub: 'Humans', text: 'New ideas, handling the unexpected, adapting when things change.' },
        { icon: 'handshake', head: 'Social intelligence and empathy', sub: 'Humans', text: 'Building trust with customers, colleagues and patients; understanding feelings.' },
        { icon: 'key', head: 'Ethical decision-making', sub: 'Humans', text: 'Judging complex situations so robots act in line with society\'s values.' },
      ],
      notes: 'Learner book page 11; Teacher Manual exemplar 6. Ask learners which human strength mattered most in their own scenario (AgriBot or ReNurse). Key message: the best results come from a partnership in which each side does what it does best.',
    });
    L.figure({
      title: 'Think about it: the airport robot',
      image: img('fig11-y2.jpg'), imageSize: [1000, 685], alt: 'A service robot with shelves for empty cups and plates in an airport lounge',
      caption: 'Figure 1.1: Robot in Amsterdam Airport, Netherlands (Review Questions 1.1)',
      heading: 'Discuss in pairs',
      points: ['Two advantages of a robot collecting cups and plates', 'Two disadvantages', 'Why might lounge staff be unhappy with their robot colleague?', 'Three other places this robot could help'],
      notes: 'Learner book page 25, Review Question 6. The robot stays in one area, moves between tables, asks visitors for finished items and returns to the kitchen when its shelves are full. Possible answers: advantages: works all day without breaks, frees staff for customer service, consistent, novelty attracts customers. Disadvantages: cost and maintenance, cannot clean spills or help a confused traveller, may block walkways, breakdowns. Staff may fear losing hours or jobs, or have to fix its mistakes. Other places: restaurants and chop bars, hospitals, hotels, conference centres, school dining halls. If time is short, set it as part of homework.',
    });

    L.divider({ title: 'Wrap up', sub: 'Exit check and homework  |  10 minutes' });
    L.quiz({
      questions: [
        'What does the term roboethics refer to?',
        'Name the four steps of a societal impact analysis.',
        'Give one positive and one negative impact of AgriBot on a farming community.',
        'Robots can make complex ethical decisions on their own. True or false? Explain.',
        'Why must humans and robots work together in healthcare?',
      ],
      notes: 'Answers: 1) The principles guiding the ethical use of robots: right and wrong in their design and use. 2) Define the scenario and the robot\'s role; identify potential impacts; reduce negative and increase positive impacts; consider the long term. 3) For example: higher yields and less herbicide; fewer farm labouring jobs. 4) False: some situations are too complex; human judgement is needed. 5) Humans give empathy, trust and ethical judgement; robots give precision and tireless monitoring. Ready-made test on the class site: "Robots and society 1 check".',
    });
    L.summary({
      points: ['Every robot brings good and bad', 'Four steps: scenario, impacts, reduce harm, long term', 'Designers plan to reduce harm before building', 'Humans and robots work best as partners'],
      homework: 'Analyse a new robot, EduBot the robot teaching assistant, on your own (Classwork). Activity 1.2: write a newspaper article of no more than 400 words on your group\'s robot. Read pages 14 to 24.',
      notes: 'Individual assignment: "Robots and society 1: EduBot scenario questions" (20 marks), a new scenario learners analyse alone with the four steps; hand out the EduBot PDF or let them read it on the class site. Homework is the assignment "Robots and society 1: newspaper article" on the class site (20 marks). Learners type it in the box or upload a photo of handwritten work. The best articles can go in the school journal or on the notice board. Next lesson: Week 2, robotics careers, job postings, cover letters and CVs.',
    });
  },
};
