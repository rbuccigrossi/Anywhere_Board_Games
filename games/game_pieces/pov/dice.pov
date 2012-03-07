#include "colors.inc"   
 
#declare DiceColor = color red 1 green .95 blue .65;
#declare DotColor = color red .1 green .1 blue .1;
 
 
#declare DiceBody = intersection {
  box { <-1, -1, -1>, <1, 1, 1> scale 0.5 }
  superellipsoid { <0.7, 0.7>  scale .63 }
}
 
#declare Middle = sphere { <0, .6, 0>, .13}
 
#declare Corners1 = union {
  sphere { <-.25, .6, -.25>, .13 }
  sphere { <.25, .6, .25>, .13 }
}
 
#declare Corners2 = union {
  sphere { <-.25, .6, .25>, .13 }
  sphere { <.25, .6, -.25>, .13 }
}
 
#declare Middles = union {
  sphere { <-.25, .6, 0>, .13 }
  sphere { <.25, .6, 0>, .13 }
}
 
#declare One = Middle
 
#declare Two = Corners1
 
#declare Three = union {
  object { Middle }
  object { Corners1 }
}
 
#declare Four = union {
  object { Corners1 }
  object { Corners2 }
}
 
#declare Five = union {
  object { Four }
  object { One }
}
 
#declare Six = union {
  object { Corners1 }
  object { Corners2 }
  object { Middles }
}
 
#declare DiceInterior = interior { ior 1.5 }
#declare DiceFinish = finish { phong 0.1 specular 0.5 ambient .4 }
 
#macro Dice(Color)
difference {
  object {
    DiceBody
    pigment { color Color filter 0.4 transmit 0.3}
    interior { DiceInterior }
    finish { DiceFinish }
  }
  union {
    object { One rotate -90*z }
    object { Two }
    object { Three rotate -90*x }
    object { Four rotate 90*x }
    object { Five rotate 180*x }
    object { Six rotate 90*z }
    pigment { White }
    finish { ambient 0.5 roughness 0.5}
 
  }
  bounded_by { box { <-.52, -.52, -.52>, <.52, .52, .52> } }
}
#end
 
object { Dice(color rgb <0, 0, 0.5>)  rotate <0, -90, 0>}
                                                         
light_source { <1.5, -1.5, -3> color rgb <3, 3, 3> }

light_source { <-9, 7, -6> color White }   
light_source { <9, -7, 6> color White }   

camera {
   location <1, -1, -3>
   look_at <0, 0, 0>
  aperture 0.4
  blur_samples 100    
  focal_point <0, 0, -0.5>
}                                                         