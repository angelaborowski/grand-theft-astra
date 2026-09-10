"""Original procedural plaster ornament and stone/wood surface maps. No photo edits."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math, random
import numpy as np
D=Path(__file__).resolve().parent/'textures';D.mkdir(exist_ok=True)
S=768;im=Image.new('RGB',(S,S*2),(212,191,133));draw=ImageDraw.Draw(im)
olive=(91,106,66);red=(158,68,45);blue=(66,98,115);gold=(186,134,55)
def curve(points,color,width):
 out=[]
 for i in range(81):
  t=i/80;u=1-t
  out.append((u**3*points[0][0]+3*u*u*t*points[1][0]+3*u*t*t*points[2][0]+t**3*points[3][0],u**3*points[0][1]+3*u*u*t*points[1][1]+3*u*t*t*points[2][1]+t**3*points[3][1]))
 draw.line(out,fill=color,width=width,joint='curve');return out
for base in range(-384,S*2,384):
 # Mirrored curling stems, pointed acanthus leaves and flowers.
 for side in [-1,1]:
  X=lambda x:S/2+side*x
  curve([(X(0),base),(X(240),base+75),(X(280),base+310),(X(15),base+365)],olive,9)
  curve([(X(20),base+90),(X(210),base+5),(X(295),base+210),(X(120),base+210)],olive,7)
  curve([(X(120),base+210),(X(50),base+175),(X(155),base+120),(X(160),base+167)],olive,6)
  for k,(x,y,a) in enumerate([(80,45,-.5),(178,92,.1),(223,165,.6),(192,284,2),(100,335,2.6),(75,127,-1.1)]):
   x=X(x);y+=base
   pts=[]
   for t in np.linspace(0,math.pi,18):
    l=65*math.cos(t);w=19*math.sin(t)*(1+.23*math.cos(t*7));pts.append((x+side*(l*math.cos(a)-w*math.sin(a)),y+l*math.sin(a)+w*math.cos(a)))
   for t in np.linspace(math.pi,0,18):
    l=65*math.cos(t);w=-19*math.sin(t);pts.append((x+side*(l*math.cos(a)-w*math.sin(a)),y+l*math.sin(a)+w*math.cos(a)))
   draw.polygon(pts,fill=olive)
   draw.line([(x-side*48*math.cos(a),y-48*math.sin(a)),(x+side*48*math.cos(a),y+48*math.sin(a))],fill=(158,159,103),width=2)
 for x,y in [(S/2,base+55),(S/2,base+295)]:
  for k in range(8):
   a=k*math.tau/8;cx=x+27*math.cos(a);cy=y+27*math.sin(a)
   draw.ellipse((cx-12,cy-19,cx+12,cy+19),fill=red if k%2 else blue)
  draw.ellipse((x-11,y-11,x+11,y+11),fill=gold)
rng=np.random.default_rng(32);arr=np.array(im).astype(float);grain=rng.normal(0,1.9,arr.shape[:2]);arr+=grain[...,None];Image.fromarray(np.clip(arr,0,255).astype('uint8')).save(D/'painted-scrollwork.png')
# Seamless mineral/wood textures generated analytically from periodic noise.
N=1024;y,x=np.mgrid[0:N,0:N]/N
noise=np.zeros((N,N))
for k in range(1,13):
 noise+=np.sin(math.tau*(k*x+(k%5+1)*y)+k*1.71)/k
veins=np.exp(-np.abs(np.sin(math.tau*(4*x+2*y)+noise*.7))*19)
for name,c,amp in [('limestone',(210,200,176),16),('red-marble',(108,62,48),29),('dark-marble',(48,39,34),18)]:
 arr=np.empty((N,N,3))
 for k in range(3):arr[:,:,k]=c[k]+noise*3+veins*amp+rng.normal(0,.9,(N,N))
 Image.fromarray(np.clip(arr,0,255).astype('uint8')).save(D/(name+'.jpg'),quality=94)
wood=np.sin(math.tau*50*x+noise*1.1)*5+np.sin(math.tau*8*x+noise*.4)*7
arr=np.stack([99+wood+noise*2,57+wood*.6,27+wood*.3],axis=-1)
Image.fromarray(np.clip(arr,0,255).astype('uint8')).save(D/'oak.jpg',quality=94)
Image.fromarray(np.clip(173+noise*9+rng.normal(0,3,(N,N)),0,255).astype('uint8')).save(D/'surface-roughness.png')

for name,base in [('stone',96),('plaster',214),('wood',139)]:
 Image.fromarray(np.clip(base+noise*5+rng.normal(0,2,(N,N)),0,255).astype('uint8')).save(D/(name+'-roughness.png'))
height=noise*.08+np.sin(math.tau*47*x+noise)*.008
dy,dx=np.gradient(height);norm=np.stack([-dx*14,-dy*14,np.ones_like(dx)],axis=-1);norm/=np.linalg.norm(norm,axis=-1)[...,None]
Image.fromarray(np.clip((norm*.5+.5)*255,0,255).astype('uint8')).save(D/'mineral-normal.png')
