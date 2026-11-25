"""Printable AgriBot and ReNurse scenarios with the assignment questions
(Robotics Year 2, Section 1, Activity 1.1, page 12; Teacher Manual Year 2 pages 14 to 15).
Usage: python3 scripts/worksheets/society-1-scenarios.py  -> public/teaching/society-1/agribot-renurse-scenarios.pdf
The questions must match the assignment 'society-1-scenarios' in src/data/ready/society-1.ts."""
import pathlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

OUT = pathlib.Path(__file__).resolve().parents[2] / 'public/teaching/society-1/agribot-renurse-scenarios.pdf'
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

QUESTIONS = [
    ('Part A: AgriBot', [
        ('1', 'In your own words, describe what AgriBot does and where it would be used.', 1),
        ('2', 'List THREE positive impacts AgriBot could have on society. Think about jobs, the environment and well-being.', 3),
        ('3', 'List THREE negative impacts AgriBot could have on society. Think about job loss, cost and fairness, and safety.', 3),
        ('4', 'Explain ONE ethical issue raised by AgriBot, for example safety, data or bias.', 1),
        ('5', 'Choose one negative impact from question 3. How could the designer reduce it?', 1),
    ]),
    ('Part B: ReNurse', [
        ('6', 'In your own words, describe what ReNurse does and where it would be used.', 1),
        ('7', 'List THREE positive impacts ReNurse could have on society.', 3),
        ('8', 'List THREE negative impacts ReNurse could have on society. Think about privacy, less human contact and jobs.', 3),
        ('9', 'Explain ONE ethical issue raised by ReNurse, for example patient data security or safety.', 1),
        ('10', 'Choose one negative impact from question 8. How could the designer reduce it?', 1),
    ]),
    ('Part C: Humans and robots', [
        ('11', 'Choose ONE of the two robots. Explain what humans will still do alongside it, and why this human-robot partnership is important.', 2),
    ]),
]

def scenario_page(s, sc, width):
    s += [Paragraph(sc['title'], ParagraphStyle('t', parent=h1, textColor=sc['colour'])),
          Paragraph('STEM 2 Robotics  |  Section 1: Robots and Society  |  Activity 1.1, Robotics Year 2, page 12', sub)]
    box = Table([[Paragraph(sc['intro'], body)]], colWidths=[width])
    box.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), PALE), ('BOX', (0, 0), (-1, -1), 1, sc['colour']), ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    s += [box, Paragraph('What it can do', h2)]
    rows = [[Paragraph(f'<b>{i}. {n}</b>', cell), Paragraph(t, cell)] for i, (n, t) in enumerate(sc['functions'], 1)]
    t = Table(rows, colWidths=[132, width - 132])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#D5DBD0')), ('ROWBACKGROUNDS', (0, 0), (-1, -1), [PALE, HexColor('#FFFFFF')]), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    s += [t, Paragraph('Things to think about', h2)]
    s += [Paragraph(x, item, bulletText='•') for x in sc['think']]
    s += [Paragraph('Use the four steps of a societal impact analysis: (1) define the scenario and the robot\'s role, (2) identify potential impacts, (3) reduce the negative impacts and increase the positive ones, (4) think about the long term.', ParagraphStyle('n', parent=body, textColor=GREY, fontSize=9.8, spaceBefore=8))]

def main():
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=42, rightMargin=42, topMargin=38, bottomMargin=38,
                            title='AgriBot and ReNurse scenarios', author='STEM 2 Robotics')
    s = []
    for sc in SCENARIOS:
        scenario_page(s, sc, doc.width); s.append(PageBreak())
    s += [Paragraph('Questions: AgriBot and ReNurse', h1),
          Paragraph('Assignment "Robots and society 1: AgriBot and ReNurse scenario questions"  |  20 marks  |  Work on your own', sub),
          Paragraph('Answer online on the class site (Classwork), or write your answers in your exercise book or on paper and upload a clear photo or a PDF of every page. '
                    'Number your answers. The marks for each question are shown in brackets.', body)]
    for part, qs in QUESTIONS:
        s.append(Paragraph(part, h2))
        s += [Paragraph(f'<b>{n}.</b>&nbsp;&nbsp;{text} <font color="#5A6270">[{m} mark{"s" if m > 1 else ""}]</font>', q) for n, text, m in qs]
    s += [Spacer(1, 8), Paragraph('Total: 20 marks', ParagraphStyle('tot', parent=body, fontName='Helvetica-Bold'))]
    doc.build(s)
    print('wrote', OUT)

main()
