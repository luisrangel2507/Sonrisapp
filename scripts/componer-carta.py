# Regenera public/odontograma-carta-v2.webp: la carta original con las
# ilustraciones realistas de public/dientes/N.webp encajadas en su columna
# (misma geometría que mapaColumna en components/OdontogramaDibujo.tsx).
# Uso: python3 scripts/componer-carta.py
import sys,os
from PIL import Image, ImageDraw
S=2
B=[0,76,151,227,284,341,397,454,511,568,625,682,739,796,872,947,1023]
FR=44; IMG_H=787; LM=FR+401
LW,LC,LH=300,150,150+1017+30; IR=(30,150,240,1017)
SUP=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]
INF=[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]
base=Image.open('public/odontograma-carta.jpg').convert('RGB').resize((1024*S,787*S),Image.LANCZOS)
d=ImageDraw.Draw(base)
pegar=[]
for f in sorted(os.listdir('public/dientes')):
    n=int(f.split('.')[0]); arriba=n in SUP; col=(SUP if arriba else INF).index(n)
    x=B[col]; w=B[col+1]-B[col]; cx=x+w/2
    yI=FR+34 if arriba else LM+2; alto=LM-FR-36 if arriba else FR+IMG_H-34-LM-4
    esc=1.05*min((w-2)/LW, alto/(LH-LC)); ox=cx-LW*esc/2; oy=yI+(alto-(LH-LC)*esc)/2-LC*esc
    r=lambda v: round(v*S)
    d.rectangle([r(x-1),r(yI-1-FR),r(x+w+1),r(yI+alto+1-FR)],fill='white')
    t=Image.open('public/dientes/'+f).convert('RGB')
    px,py,pw,ph=ox+esc*IR[0], oy+esc*IR[1]-FR, esc*IR[2], esc*IR[3]
    pegar.append((t.resize((r(pw),r(ph)),Image.LANCZOS),(r(px),r(py))))
# Primero se blanquean todas las columnas y luego se pegan los dientes,
# para que una columna no tape lo que el diente vecino rebasa.
from PIL import ImageChops
for img,pos in pegar:
    caja=(pos[0],pos[1],pos[0]+img.width,pos[1]+img.height)
    # "darker": el fondo blanco de la ilustración no borra al vecino.
    base.paste(ImageChops.darker(base.crop(caja),img),pos)
base.save('public/odontograma-carta-v2.webp',quality=78,method=6)
print(os.path.getsize('public/odontograma-carta-v2.webp'))

# Versión por contenido: el navegador guarda las imágenes en caché, así
# que cada cambio genera una URL nueva para que se vea al momento.
import hashlib
h=hashlib.sha1(open('public/odontograma-carta-v2.webp','rb').read())
for f in sorted(os.listdir('public/dientes')):
    h.update(open('public/dientes/'+f,'rb').read())
v=h.hexdigest()[:10]
open('lib/odontograma-version.ts','w').write(
    '// Generado por scripts/componer-carta.py — no editar a mano.\n'
    f'export const ODONTOGRAMA_VERSION = "{v}";\n')
print('version',v)
