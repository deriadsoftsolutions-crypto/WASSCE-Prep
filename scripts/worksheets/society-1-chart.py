"""Printable Activity 1.1 impact analysis chart (Robotics Year 2, Section 1).
Usage: python3 scripts/worksheets/society-1-chart.py  -> public/teaching/society-1/impact-analysis-chart.pdf"""
import pathlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

OUT = pathlib.Path(__file__).resolve().parents[2] / 'public/teaching/society-1/impact-analysis-chart.pdf'
GREEN, NAVY, GREY = HexColor('#006B3F'), HexColor('#14213D'), HexColor('#5A6270')
W, H = A4
M = 36

SECTIONS = [
    ('1. Robot description', 'What does the robot do, and where? (agriculture or healthcare). Write any assumptions you make.', 0.9),
    ('2. Positive impacts (at least 3)', 'Think about jobs, the environment, health and overall well-being. "One benefit for ... is ..."', 1.25),
    ('3. Negative impacts (at least 3)', 'Think about job loss, privacy, less human contact, cost, safety. "A risk for ... is ..."', 1.25),
    ('4. Ethical considerations (at least 2)', 'Safety, data security, bias in design or operation. Who is responsible if it makes a mistake?', 1.0),
    ('5. Reducing harm and the long term', 'For each negative impact, how could the designer reduce it? Upgrades, e-waste, training.', 1.1),
    ('6. Human-robot partnership', 'What will humans still do alongside the robot, and why is this partnership important?', 0.9),
]

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle('Activity 1.1: Impact analysis chart')
    c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 17)
    c.drawString(M, H - M - 8, 'Activity 1.1: Impact analysis chart')
    c.setFont('Helvetica', 9.5); c.setFillColor(GREY)
    c.drawString(M, H - M - 24, 'STEM 2 Robotics  |  Section 1: Robots and Society  |  Robotics Year 2, pages 12 to 13')
    y = H - M - 46
    c.setFillColor(NAVY); c.setFont('Helvetica', 10.5)
    c.drawString(M, y, 'Group members: ' + '_' * 70)
    y -= 20
    c.drawString(M, y, 'Class: ' + '_' * 18 + '     Robot chosen (tick):   [  ] A: AgriBot     [  ] B: ReNurse')
    y -= 14
    total = sum(s[2] for s in SECTIONS)
    avail = y - M - 30
    for head, hint, wt in SECTIONS:
        h = avail * wt / total
        c.setStrokeColor(GREEN); c.setLineWidth(1.2)
        c.rect(M, y - h, W - 2 * M, h - 6)
        c.setFillColor(GREEN); c.setFont('Helvetica-Bold', 11.5); c.drawString(M + 8, y - 22, head)
        c.setFillColor(GREY); c.setFont('Helvetica-Oblique', 8.8); c.drawString(M + 8, y - 35, hint)
        c.setStrokeColor(HexColor('#D5DBD0')); c.setLineWidth(0.5)
        ly = y - 54
        while ly > y - h + 8:
            c.line(M + 8, ly, W - M - 8, ly); ly -= 19
        y -= h
    c.setFillColor(GREY); c.setFont('Helvetica', 8.5)
    c.drawString(M, M, 'Present your chart to the class (3 minutes). Photograph it and upload it to the class site for the group presentation assignment.')
    c.save()
    print('wrote', OUT)

main()
