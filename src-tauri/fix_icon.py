from PIL import Image

input_icon = "./icons/icon.ico"
output_icon = "./icons/icon_fixed.ico"

img = Image.open(input_icon)
img.save(output_icon, sizes=[(256, 256), (128, 128),
         (64, 64), (48, 48), (32, 32), (16, 16)])

print("✅ Ícone corrigido e salvo como icon_fixed.ico")
