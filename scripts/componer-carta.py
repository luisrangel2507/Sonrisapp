# Regenera public/odontograma-carta-v2.webp: la carta original con las
# ilustraciones realistas de public/dientes/N.webp encajadas en su columna
# (con el mismo alto y posición que el dibujo original de cada diente; la
# colocación se exporta a lib/odontograma-version.ts para las marcas).
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
orig=Image.open('public/odontograma-carta.jpg').convert('L')
pegar=[]; coloc={}
for f in sorted(os.listdir('public/dientes')):
    n=int(f.split('.')[0]); arriba=n in SUP; col=(SUP if arriba else INF).index(n)
    x=B[col]; w=B[col+1]-B[col]
    yI=FR+34 if arriba else LM+2; alto=LM-FR-36 if arriba else FR+IMG_H-34-LM-4
    # Mide el dibujo original de ese diente (trazos oscuros dentro de su
    # columna) para que la ilustración ocupe exactamente el mismo alto y
    # quede centrada donde estaba: así la carta conserva sus proporciones.
    zona=orig.crop((x+3,yI-FR+4,x+w-3,yI-FR+alto-4)).point(lambda v:255 if v<150 else 0)
    bb=zona.getbbox()
    bx0,by0,bx1,by1=bb[0]+x+3,bb[1]+yI-FR+4,bb[2]+x+3,bb[3]+yI-FR+4
    esc=(by1-by0)/IR[3]
    ox=(bx0+bx1)/2-(IR[0]+IR[2]/2)*esc; oy=by0+FR-IR[1]*esc
    coloc[n]=(round(esc,5),round(ox,2),round(oy,2))
    r=lambda v: round(v*S)
    # Se blanquea la columna completa (para no dejar trazos sueltos del
    # dibujo de línea), respetando el borde exterior y la línea media.
    izq=x+2 if x in (0,511) else x-2; der=x+w-2 if x+w in (511,1023) else x+w+2
    d.rectangle([r(izq),r(by0-3),r(der),r(by1+3)],fill='white')
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
    f'export const ODONTOGRAMA_VERSION = "{v}";\n'
    '// Colocación de cada ilustración en la carta: [escala, x, y] del lienzo.\n'
    'export const COLOCACION_DIENTES: Record<number, [number, number, number]> = {\n'
    + ''.join(f'  {n}: [{e}, {x}, {y}],\n' for n,(e,x,y) in sorted(coloc.items()))
    + '};\n')
print('version',v)
