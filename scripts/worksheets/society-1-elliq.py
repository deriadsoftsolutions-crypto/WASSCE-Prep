"""Printable Elli Q scenario card (Robotics Year 2, Section 1, pages 9 to 10; Teacher Manual Year 2 page 12).
Usage: python3 scripts/worksheets/society-1-elliq.py  -> public/teaching/society-1/elli-q-scenario.pdf"""
import pathlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

OUT = pathlib.Path(__file__).resolve().parents[2] / 'public/teaching/society-1/elli-q-scenario.pdf'
GREEN, NAVY, GREY, PALE = HexColor('#006B3F'), HexColor('#14213D'), HexColor('#5A6270'), HexColor('#F2F4EF')

h1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=NAVY, spaceAfter=2)
sub = ParagraphStyle('sub', fontName='Helvetica', fontSize=9.5, leading=12, textColor=GREY, spaceAfter=10)
h2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=GREEN, spaceBefore=8, spaceAfter=4)
body = ParagraphStyle('body', fontName='Helvetica', fontSize=10.5, leading=14.5, textColor=NAVY, spaceAfter=5)
item = ParagraphStyle('item', parent=body, leftIndent=16, bulletIndent=2)
cell = ParagraphStyle('cell', parent=body, fontSize=10, leading=13, spaceAfter=0)

FUNCTIONS = [
    ('Better communication', 'Elli Q can hold natural conversations, noticing the user\'s tone of voice, facial expressions and preferences. It helps the elderly person stay in touch with family and friends through video calls.'),
    ('Daily assistance', 'Elli Q reminds the user to take their medication, go to appointments and do daily activities. It can also help with small tasks like adjusting the thermostat or turning on the lights using voice commands.'),
    ('Health monitoring', 'Elli Q can be fitted with sensors that track things like heart rate, blood pressure and sleep patterns. If something unusual is detected, it prompts the user to see a doctor, with a clear warning that it is not a medical device.'),
    ('Emotional support', 'Elli Q can recognise how the user is feeling and respond: offering words of encouragement, playing calming music, or suggesting ways to relax.'),
    ('Cognitive stimulation', 'Elli Q offers activities that keep the mind active, such as memory games, trivia quizzes and learning activities based on the user\'s interests.'),
]

def main():
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=42, rightMargin=42, topMargin=38, bottomMargin=38,
                            title='Scenario: Elli Q, a robot companion for elderly care', author='STEM 2 Robotics')
    s = [Paragraph('Scenario: Elli Q, a robot companion for elderly care', h1),
         Paragraph('STEM 2 Robotics  |  Section 1: Robots and Society  |  Worked example of a societal impact analysis  |  Robotics Year 2, pages 9 to 11', sub)]
    intro = Table([[Paragraph('<b>Imagine</b> a robot named <b>Elli Q</b>. It is designed to provide companionship and basic care for elderly people who live on their own at home. '
                              'Many of them find some daily tasks difficult, can feel lonely, and need reminders to look after their health. '
                              'Elli Q is meant to help them live safely and happily on their own for longer.', body)]], colWidths=[doc.width])
    intro.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), PALE), ('BOX', (0, 0), (-1, -1), 1, GREEN), ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    s += [intro, Paragraph('What Elli Q is designed to do', h2)]
    rows = [[Paragraph(f'<b>{i}. {name}</b>', cell), Paragraph(text, cell)] for i, (name, text) in enumerate(FUNCTIONS, 1)]
    t = Table(rows, colWidths=[118, doc.width - 118])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#D5DBD0')),
                           ('ROWBACKGROUNDS', (0, 0), (-1, -1), [PALE, HexColor('#FFFFFF')]), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    s += [t, Paragraph('Analyse Elli Q with the four steps', h2)]
    steps = ['<b>Step 1: Scenario and role.</b> Who is Elli Q for, and where will it be used? (Read above.)',
             '<b>Step 2: Identify potential impacts.</b> List the positive impacts and the possible negative impacts on the elderly user, their family, caregivers and society. Think about independence, health, loneliness, privacy, training and fairness.',
             '<b>Step 3: Reduce the negative impacts and increase the positive ones.</b> For each negative impact, what could the designer do about it?',
             '<b>Step 4: Think about the long term.</b> What happens when Elli Q goes out of date or stops working? How will it affect human caregivers?']
    s += [Paragraph(x, item, bulletText='•') for x in steps]
    s += [Paragraph('Think about Ghana', h2),
          Paragraph('In many Ghanaian homes, elderly people live with their children and grandchildren. Who might still need a robot like Elli Q? '
                    '(For example, elderly people whose children work in the city or abroad.) Would it be accepted by families here? Why or why not?', body)]
    notes = Table([[Paragraph('<b>Notes</b>', cell)]] + [[''] for _ in range(4)], colWidths=[doc.width], rowHeights=[20] + [20] * 4)
    notes.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, GREEN), ('LINEBELOW', (0, 1), (-1, -2), 0.4, HexColor('#D5DBD0'))]))
    s += [Spacer(1, 6), KeepTogether(notes)]
    doc.build(s)
    print('wrote', OUT)

main()
