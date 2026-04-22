import fitz 

doc = fitz.open("final_PROJECT_grading-factor.pdf")
text = ""
for page in doc:
    text += page.get_text()

lines = text.split("\n")
out = []
in_level3 = False
for i, line in enumerate(lines):
    if "Level 3" in line or "level 3" in line.lower() or "LEVEL 3" in line:
        in_level3 = True
    if "Level 4" in line or "level 4" in line.lower() or "LEVEL 4" in line:
        in_level3 = False
    
    if in_level3:
        out.append(line)

with open("extract_level3_full.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
