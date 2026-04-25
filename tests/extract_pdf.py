import fitz 

doc = fitz.open("final_PROJECT_grading-factor.pdf")
text = ""
for page in doc:
    text += page.get_text()

lines = text.split("\n")

# Extract Level 4
out_l4 = []
in_level4 = False
for i, line in enumerate(lines):
    if "Level 4" in line or "LEVEL 4" in line:
        in_level4 = True
    if in_level4 and ("Level 5" in line or "LEVEL 5" in line):
        in_level4 = False
        break
    if in_level4:
        out_l4.append(line)

with open("extract_level4_full.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out_l4))

# Also extract full PDF text for reference
with open("extract_full.txt", "w", encoding="utf-8") as f:
    f.write(text)
