# Imágenes originales de las presentaciones

Miembros `.timp` sin modificar de `intro_fase1.tin`, `intro_fase2.tin` e `intro_fase3.tin`.
Recuperados del paquete distribuible de SuperTirititran para AmigaOS 4 (HunoPPC, CaninoStudios), versión 0.9.0.1:
https://os4depot.net/?function=showfile&file=game/shmup/tirititran.lha
Descarga: https://os4depot.net/share/game/shmup/tirititran.lha

Los tres XML recuperados coinciden byte a byte con los originales aportados por el usuario en `assets/data/intro_fase1..3/intro.xml`. Los 16 audios de las intros 1 y 3 también coinciden byte a byte con `assets/audio/intro_fase1/` y `assets/audio/intro_fase3/`. Se utilizan estos XML y audios locales; aquí solo se conservan las imágenes que faltaban.

El proceso de preparación convierte las imágenes PNG/JPEG empaquetadas como `.timp` en PNG en `public/assets/images/intro_faseN/`. No cambia estos originales. `sha256.json` permite verificar su integridad.
