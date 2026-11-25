"""Printable robot scenarios for Robots and society 1 (STEM 2, Section 1, Week 1).
Usage: python3 scripts/worksheets/society-1-scenarios.py
  -> public/teaching/society-1/agribot-renurse-scenarios.pdf  (Activity 1.1 group work, Robotics Year 2 page 12)
  -> public/teaching/society-1/edubot-scenario.pdf            (new scenario + questions for the individual assignment)
The EduBot questions must match the assignment 'society-1-edubot' in src/data/ready/society-1.ts."""
import pathlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

DIR = pathlib.Path(__file__).resolve().parents[2] / 'public/teaching/society-1'
GREEN, NAVY, GREY, PALE, BLUE = HexColor('#006B3F'), HexColor('#14213D'), HexColor('#5A6270'), HexColor('#F2F4EF'), HexColor('#1F6FB2')

h1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=NAVY, spaceAfter=2)
sub = ParagraphStyle('sub', fontName='Helvetica', fontSize=9.5, leading=12, textColor=GREY, spaceAfter=10)
h2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=GREEN, spaceBefore=10, spaceAfter=4)
body = ParagraphStyle('body', fontName='Helvetica', fontSize=10.5, leading=14.5, textColor=NAVY, spaceAfter=5)
item = ParagraphStyle('item', parent=body, leftIndent=16, bulletIndent=2)
cell = ParagraphStyle('cell', parent=body, fontSize=10.2, leading=13.5, spaceAfter=0)
q = ParagraphStyle('q', parent=body, leftIndent=22, firstLineIndent=-22, spaceAfter=6)

SCENARIOS = [
    dict(
        title='Scenario A: AgriBot, the agricultural assistant robot', colour=GREEN,
        intro='<b>AgriBot</b> is a versatile robot designed to help farmers with many farming tasks. Different attachments can be fitted to it, so the same robot can do different jobs through the farming season. '
              'Imagine AgriBot working on a cocoa, maize or vegetable farm in Ghana.',
        functions=[
            ('Planting and seeding', 'AgriBot plants seeds at exactly the best depth and distance apart. This reduces wasted seed and gives the biggest possible harvest (yield).'),
            ('Weed control', 'Cameras and AI (artificial intelligence) help AgriBot recognise weeds. It targets and removes only the weeds, using very little herbicide.'),
            ('Crop monitoring and irrigation', 'Sensors on AgriBot check soil moisture, nutrient levels and crop health. Farmers can then water exactly where it is needed and put fertiliser only where crops need it.'),
            ('Harvesting', 'For some crops, AgriBot can be adapted to harvest automatically. This reduces manual labour and makes sure the crop is collected efficiently.'),
        ],
        think=['Who works on farms in your community today? What would change for them?', 'Who could afford AgriBot: a large commercial farm, a farmers\' cooperative, a small family farm?', 'What happens to the land, water and environment?', 'What data does AgriBot collect, and who owns it?'],
    ),
    dict(
        title='Scenario B: ReNurse, the robotic nursing assistant', colour=BLUE,
        intro='<b>ReNurse</b> is a mobile robot designed to help nurses in hospitals and care facilities. It moves around the ward and supports patient care, so that nurses can spend their time where they are needed most. '
              'Imagine ReNurse working on a ward in a district or regional hospital in Ghana.',
        functions=[
            ('Patient monitoring', 'ReNurse checks patients\' vital signs (such as temperature, pulse and blood pressure), medication schedules and activity levels, and gives nurses the data in real time.'),
            ('Basic care tasks', 'ReNurse helps with tasks such as delivering meals, moving patients from place to place, and helping patients with mobility exercises.'),
            ('Communication and companionship', 'ReNurse talks with patients and offers games or entertainment, giving them social interaction and emotional support.'),
            ('Data collection and analysis', 'ReNurse gathers patient data and spots trends over time, helping nurses make informed decisions about care.'),
        ],
        think=['How would patients and their families feel about being cared for by a robot?', 'What would change for nurses and other hospital workers?', 'What happens if ReNurse gives a wrong reading or breaks down?', 'Who can see the patient data ReNurse collects?'],
    ),
]

EDUBOT = dict(
    title='Scenario: EduBot, the robot teaching assistant', colour=HexColor('#B8860B'),
    source='STEM 2 Robotics  |  Section 1: Robots and Society  |  Individual assignment  |  A new scenario, not in the textbook',
    intro='Many Senior High School classes in Ghana have 50 or more learners and one teacher. Imagine that the Ministry of Education plans to test <b>EduBot</b>, a robot teaching assistant, '
          'in some SHS classrooms, with one EduBot in each class. EduBot moves around the classroom on wheels, has a camera, a microphone, a speaker and a touch screen, '
          'and connects to the internet. It is meant to support the class teacher, not to replace them.',
    functions=[
        ('Attendance', 'A camera at the classroom door recognises each learner\'s face and takes the register automatically. If a learner is absent, EduBot sends a text message to their parent or guardian.'),
        ('Marking and feedback', 'EduBot marks class exercises and tests in seconds, including short written answers, gives each learner feedback, and records every mark.'),
        ('Personal tutoring', 'Learners can ask EduBot questions at any time. It explains topics step by step, in English and in some Ghanaian languages, and changes its pace to suit each learner.'),
        ('Classroom support', 'EduBot moves between desks to help learners who are stuck, plays videos and simulations, and reads text aloud for learners with poor eyesight.'),
        ('Reports and predictions', 'Every week EduBot sends reports to the teacher, the headteacher and parents. It also predicts which learners are likely to fail the WASSCE so that they can get extra help early.'),
    ],
    think=['How would learners, teachers and parents feel about EduBot?', 'What happens to learners\' faces, marks and messages that EduBot collects?', 'Can EduBot mark fairly? What if it is wrong?', 'What about schools with no reliable electricity or internet?', 'What can a human teacher do that EduBot cannot?'],
)

QUESTIONS = [
    ('Step 1: The scenario', [
        ('1', 'Describe EduBot\'s role in your own words: what it does, who it is for, and where it would be used.', 2),
    ]),
    ('Step 2: Potential impacts', [
        ('2', 'List THREE positive impacts EduBot could have. Think about learners, teachers, parents and society.', 3),
        ('3', 'List THREE negative impacts EduBot could have. Think about jobs, privacy, fairness, cost and human contact.', 3),
        ('4', 'Explain TWO ethical issues raised by EduBot, for example the face recognition camera, learners\' data, or fairness in marking and predictions.', 4),
    ]),
    ('Step 3: Reduce the harm, increase the good', [
        ('5', 'Choose TWO of the negative impacts you listed in question 3. For each one, explain how the designers or the school could reduce it.', 4),
    ]),
    ('Step 4: The long term', [
        ('6', 'Describe ONE long-term impact of EduBot, for example e-waste, going out of date, or the effect on the teaching profession, and how it could be managed.', 2),
    ]),
    ('Humans and robots', [
        ('7', 'What will the class teacher still do that EduBot cannot? Explain why this human-robot partnership is important in a classroom.', 2),
    ]),
]

def scenario_page(s, sc, width):
    s += [Paragraph(sc['title'], ParagraphStyle('t', parent=h1, textColor=sc['colour'])),
          Paragraph(sc.get('source', 'STEM 2 Robotics  |  Section 1: Robots and Society  |  Activity 1.1, Robotics Year 2, page 12'), sub)]
    box = Table([[Paragraph(sc['intro'], body)]], colWidths=[width])
    box.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), PALE), ('BOX', (0, 0), (-1, -1), 1, sc['colour']), ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    s += [box, Paragraph('What it can do', h2)]
    rows = [[Paragraph(f'<b>{i}. {n}</b>', cell), Paragraph(t, cell)] for i, (n, t) in enumerate(sc['functions'], 1)]
    t = Table(rows, colWidths=[132, width - 132])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#D5DBD0')), ('ROWBACKGROUNDS', (0, 0), (-1, -1), [PALE, HexColor('#FFFFFF')]), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    s += [t, Paragraph('Things to think about', h2)]
    s += [Paragraph(x, item, bulletText='•') for x in sc['think']]
    s += [Paragraph('Use the four steps of a societal impact analysis: (1) define the scenario and the robot\'s role, (2) identify potential impacts, (3) reduce the negative impacts and increase the positive ones, (4) think about the long term.', ParagraphStyle('n', parent=body, textColor=GREY, fontSize=9.8, spaceBefore=8))]

def frame(path, title):
    return SimpleDocTemplate(str(path), pagesize=A4, leftMargin=42, rightMargin=42, topMargin=38, bottomMargin=38, title=title, author='STEM 2 Robotics')

def main():
    DIR.mkdir(parents=True, exist_ok=True)
    out = DIR / 'agribot-renurse-scenarios.pdf'
    doc = frame(out, 'AgriBot and ReNurse scenarios'); s = []
    scenario_page(s, SCENARIOS[0], doc.width); s.append(PageBreak()); scenario_page(s, SCENARIOS[1], doc.width)
    doc.build(s); print('wrote', out)

    out = DIR / 'edubot-scenario.pdf'
    doc = frame(out, 'EduBot scenario and questions'); s = []
    scenario_page(s, EDUBOT, doc.width); s.append(PageBreak())
    s += [Paragraph('Questions: EduBot', h1),
          Paragraph('Assignment "Robots and society 1: EduBot scenario questions"  |  20 marks  |  Work on your own', sub),
          Paragraph('Use the four steps of a societal impact analysis. Answer online on the class site (Classwork), or write your answers in your exercise book or on paper '
                    'and upload a clear photo or a PDF of every page. Number your answers. The marks for each question are shown in brackets.', body)]
    for part, qs in QUESTIONS:
        s.append(Paragraph(part, h2))
        s += [Paragraph(f'<b>{n}.</b>&nbsp;&nbsp;{text} <font color="#5A6270">[{m} mark{"s" if m > 1 else ""}]</font>', q) for n, text, m in qs]
    s += [Spacer(1, 8), Paragraph('Total: 20 marks', ParagraphStyle('tot', parent=body, fontName='Helvetica-Bold'))]
    doc.build(s); print('wrote', out)

main()
