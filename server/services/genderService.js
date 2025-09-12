// Servicio simple para inferir sexo a partir del primer nombre (heurística)
// Nota: Heurística básica para nombres comunes en ES; para mejor calidad, integrar APIs externas.

function normalize(s) {
  return (s || "").toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

const femaleNames = new Set([
  'maria','ana','laura','carmen','luisa','sofia','gabriela','isabel','patricia','julia','valentina','paula','andrea','adriana','alejandra','teresa','rosa','mariana','monica','veronica','fernanda','beatriz','diana','silvia','claudia','karla','angela','lorena','carolina','antonella','camila','noelia','martina','victoria','ariana','ximena','daniela'
])

const maleNames = new Set([
  'juan','carlos','jose','luis','pedro','jorge','andres','miguel','diego','alejandro','fernando','ricardo','daniel','sergio','pablo','martin','roberto','antonio','javier','hector','adrian','eduardo','francisco','gustavo','nicolas','ramon','raul','victor','enrique','manuel','marcos','felipe','emilio','cristian','oscar'
])

function inferSexByName(fullName) {
  const n = normalize(fullName).trim()
  if (!n) return 'O'
  const first = n.split(/\s+/)[0]
  if (femaleNames.has(first)) return 'F'
  if (maleNames.has(first)) return 'M'
  // Reglas finales por terminación (muy débiles, aplicar con cautela)
  if (first.endsWith('a')) return 'F'
  if (first.endsWith('o')) return 'M'
  return 'O'
}

module.exports = { inferSexByName }
