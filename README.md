# Organizador de Horario Escolar

Un organizador, visualizador y personalizador de horarios universitarios moderno y dinamico. Esta herramienta esta diseñada para ayudar a los estudiantes universitarios durante sus procesos de reinscripcion, permitiendoles estructurar, visualizar y elegir las mejores combinaciones de materias y profesores de forma intuitiva.

## Que es y para que sirve?

Armar un horario universitario puede ser un dolor de cabeza cuando tienes que equilibrar creditos, lidiar con empalmes de horas y buscar a los mejores profesores. **Organizador de Horario Escolar** resuelve este problema al ofrecerte un entorno visual interactivo. 

Puedes registrar todas las materias, crear multiples grupos para cada una, y luego usar interruptores dinamicos para ir "encendiendo" o "apagando" grupos. La interfaz grafica te mostrara en tiempo real como va quedando tu semana, te advertira de colisiones de horarios, y te dara estadisticas como tus horas muertas, creditos y horas semanales.

## Funcionalidades Principales

- **Visualizador de Horario Interactivo**: Rejilla semanal con diseno de bloques dinamicos. Si multiples clases se cruzan, los bloques se dividen automaticamente en columnas para que veas los empalmes claramente.
- **Gestor de Materias y Grupos**: Agrega y edita facilmente tus materias (con creditos y horas) y asigna multiples grupos a cada una (con nombre del profesor y horas exactas).
- **Ranking de Profesores**: Califica a los profesores de 1 a 5 estrellas para ayudarte a tomar decisiones sobre que clase tomar.
- **Diseno UI/UX y Personalizacion**: Interfaz elegante con temas de colores completos (Cyberpunk, Dracula, etc), opciones de estilo de cuadricula (Glassmorphism, cuadros) y diseno veloz.
- **Gestor de Borradores**: Guarda distintas versiones de tu horario como borradores para compararlos rapidamente.
- **Exportacion a Imagen PNG HD**: Guarda tu horario generado como una imagen en alta resolucion perfecta para usar como fondo de pantalla de celular o compartirla.
- **Exportacion a PDF (1 Hoja)**: Imprime o guarda en PDF tu horario o lista de materias con un clic.
- **Persistencia de Datos Híbrida**: Tu configuración se guarda de manera segura en un archivo `initial_data.json`.
  -  **Guardar**: Actualiza tu archivo en el servidor, o te pide descargarlo si estás sin conexión (`file:///`).
  -  **Guardar Copia**: Descarga un respaldo independiente a tu PC en cualquier momento.
  -  **Cargar JSON**: Sube cualquier respaldo, la app validará que la estructura sea correcta antes de leerlo.
  -  **Recargar**: Descarta tus cambios no guardados y vuelve a leer la base de datos principal.

## Tecnologias Utilizadas

Este proyecto esta construido con tecnologias base, enfocandose en rendimiento, estetica premium y simplicidad.

- **Estructura**: HTML5 semantico.
- **Estilos**: Vanilla CSS (Variables nativas, Flexbox, CSS Grid).
- **Logica**: Vanilla JavaScript (ES6+) y Node.js para guardado de archivos locales.
- **Iconografia**: Lucide Icons.

## Instalacion y Uso (Modo Servidor vs Modo Local)

La app está diseñada para funcionar de dos formas: con un servidor local (Experiencia Completa) o simplemente dándole doble clic al `index.html` (Modo Offline).

**Para la Experiencia Completa (Guardado Automático en Servidor):**

1. Clona o descarga el repositorio en tu computadora.
2. Abre la terminal en la carpeta del proyecto.
3. Asegurate de tener Node.js instalado.
4. Ejecuta el comando: `node server.js`
5. Abre en tu navegador la direccion: `http://localhost:3000`

**Para el Modo Offline (Guardado Asistido Local):**

1. Simplemente entra a la carpeta del proyecto y dale doble clic al archivo `index.html`.
2. Se abrirá en tu navegador (la URL dirá `file:///...`).
3. Podrás usar la app normalmente. Cuando presiones **Guardar**, la aplicación te pedirá descargar el archivo `initial_data.json`. Deberás guardarlo y reemplazar el archivo original que se encuentra dentro de la carpeta `/data`.


<br><br><br>

## Autor

Desarrollado y diseñado por **Rafael Piedra S**.
GitHub: https://github.com/rafa11512

<br>

<div align="center" style="font-family: monospace; white-space: pre; line-height: 1.2; letter-spacing: 0px;">
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⢤⣤⡀⠀⠀⠀⠀⠀⠀⢀⣤⠶⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀<br />
⠀⠀⠀⠀⠀⠀⠀⢀⠴⡟⠛⠂⣼⠟⠸⠿⣷⣿⣷⡒⢿⡃⠘⣛⠾⣤⠀⠀⠀⠀⠀⠀⠀<br />
⠀⠀⠀⠀⠀⠀⡠⣥⢿⠟⣠⡾⠁⢘⣻⠿⠈⣯⣍⠻⡀⢿⣦⠹⡻⡌⢱⠀⠀⠀⠀⠀⠀<br />
⠀⠀⠀⠀⠀⡰⢻⡇⡞⣼⡟⢡⡾⣻⠏⢠⣶⡙⠻⡛⢿⡸⣿⡄⠁⢻⡘⣦⡀⠀⠀⠀⠀<br />
⠀⠀⠀⠀⢀⡇⣿⢸⢳⣿⢡⠏⡴⢋⣴⣿⣿⣿⣦⡈⢶⣧⢻⣧⠀⠘⡇⣀⢷⠀⠀⠀⠀<br />
⢀⡤⣠⠤⠼⠡⠏⣾⢸⣿⠘⣪⣥⣉⣩⣿⣿⣿⣦⣶⣶⡝⢸⣿⠀⠇⢃⣟⣸⠤⠤⢤⡤<br />
⠀⠙⢖⣬⣅⢠⢀⠐⢸⣏⠘⡗⠒⠚⣿⣿⣿⣿⡟⠒⠚⡏⡼⣿⠀⢺⠃⣀⣾⢠⠟⠋⠀<br />
⠀⠀⠀⠁⡜⣿⣺⣧⡀⠻⡀⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣏⢽⡟⠰⠬⠾⠗⠐⠍⠀⠀⠀<br />
⠀⠀⠀⣸⠃⡇⢺⡆⣠⣄⠁⠈⣿⣿⣏⠿⡻⢏⣿⣿⣿⣿⢘⣡⡆⡄⣾⡌⠷⠅⠀⠀⠀<br />
⠀⠀⠀⢁⢰⣇⢸⡃⣿⢉⣡⣤⣬⠙⠻⠿⠿⠿⠿⢛⣋⣀⡈⢩⣥⣅⠙⢓⣬⣇⡀⠀⠀<br />
⠀⠀⠀⡌⢸⣿⢸⣇⢰⣿⣿⡏⣴⣦⣤⣤⣶⣶⡆⣿⣿⣿⣿⢸⣿⣿⠸⣿⡿⢖⢺⠀⠀<br />
⠀⠀⢠⠁⣿⢿⡆⣿⠀⢻⣿⡇⣿⣿⣿⣿⣿⣿⡇⢸⣿⣿⡟⠸⣿⣿⠀⣿⣿⠯⡽⠀⠀<br />
⠀⢠⢱⣧⣿⢸⣧⢻⡇⠈⣻⣷⢸⣿⣿⣿⣿⣷⡶⣼⣿⠏⢁⣄⣼⡏⢠⣿⡧⢵⠃⠀⠀<br />
⠀⣸⣾⢻⢹⡈⣿⡘⣷⢸⣛⣛⠸⣿⣿⣿⣿⡿⠇⠟⡁⣠⣬⢉⡛⢁⣼⣿⡯⠭⠆⠀⠀
</div>
