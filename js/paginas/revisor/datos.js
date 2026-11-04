// @ts-nocheck
// Mi Ficha y Revisor de Empleos: datos fijos (rangos, habilidades, trasfondos, ventajas, sueldos). Copiados tal cual
// del código antiguo (fase 8c).
export const RANKS = ['No cumple','Novato','Competente','Experto','Maestro','Legendario'];
export const RANK_SHORT = ['—','Nov.','Comp.','Exp.','Maes.','Leg.'];
export const SKILL_LV = ['Desentrenado (+0)','Novato (+1)','Competente (+2)','Experto (+4)','Maestro (+7)','Legendario (+9)'];
export const SKILL_NAME = ['Desentrenado','Novato','Competente','Experto','Maestro','Legendario'];
export const ATTRS = ['Vigor','Destreza','Carisma','Voluntad','Percepción','Inteligencia','Poder'];
export const ART = 'Arte/Artesanía';
export const SKILLS = {
  'Vigor':['Atletismo','Pelea'],
  'Destreza':['Esquiva','Latrocinio','Sigilo','Vuelo'],
  'Carisma':['Coordinación','Intimidación','Oratoria','Seducción','Subterfugio'],
  'Voluntad':[ART,'Estilo','Frialdad'],
  'Percepción':['Alerta','Consciencia','Empatía','Iniciativa','Investigación'],
  'Inteligencia':['Adivinación','Arcanismo','Callejeo','Cultura Mágica','Cultura Muggle','Herbología','Magizoología','Medicina','Política','Supervivencia'],
  'Poder':['Duelo','Pociones','Rituales']
};
export const ALL_SKILLS = Object.values(SKILLS).flat();
export const BG_TYPES = ['Biblioteca','Influencia','Informantes','Seguidores'];
export const ADVS = ['Fama','Orden de Merlín','Patrón','Recursos'];
export const CAT_CONOC = {
  'Adivinación':['Métodos adivinatorios','Profecías'],
  'Arcanismo':['Arcanos','Artes oscuras','No-Seres','Objetos mágicos','Otros planos'],
  'Callejeo':['Contrabando','Criminales','Localizaciones'],
  'Cultura Mágica':['Deportes mágicos','Historia de la magia','Hogwarts','Mundo del corazón'],
  'Cultura Muggle':['Arte muggle','Deportes muggles','Tecnología'],
  'Herbología':['Pociones','Plantas naturales'],
  'Magizoología':['Animales muggles','Bestias mágicas','Espíritus','Seres racionales'],
  'Medicina':['Enfermedades mágicas','Experimental','Heridas mágicas','Medicina muggle'],
  'Política':['Ley mágica','Ministerio de Magia'],
  'Supervivencia':['Caza','Entornos hostiles','Orientarse']
};
export const CAT_SOC = {
  'Académicos':['Adivinadores y oráculos','Arcanistas','Arqueólogos e historiadores','Biólogos e investigadores médicos','Herbólogos y pocionistas','Magizoólogos','Muggleólogos'],
  'Bajos fondos':['Contrabandistas','Estafadores','Evanescedores','Falsificadores','Ladrones','Sanadores ilegales','Soplones'],
  'Hogwarts':['Gryffindor','Hufflepuff','Ravenclaw','Slytherin','Fauna de Hogwarts','Personal no-docente','Profesorado'],
  'Política':['Azkaban','Bastión Woodcroft','Confederación Internacional de Magos','Gringotts','Hogsmeade','Ministerio de Magia','San Mungo'],
  'Seres mágicos':['Arpías','Centauros','Duendes','Gente del Agua','Gigantes','Hombres Lobo','Vampiros'],
  'Sociedad':['Alta sociedad','Deportes','Fantasmas','La Reserva','Muggles','Negocios','Prensa']
};
export const cats = t => t === 'Biblioteca' ? CAT_CONOC : CAT_SOC;
export const SUELDOS = {
  'Muy Bajo':[15,25,40,60,100], 'Bajo':[30,50,80,120,200], 'Medio':[45,75,125,175,300],
  'Alto':[60,100,160,250,400], 'Muy Alto':[75,125,200,300,500]
};

