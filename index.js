import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const pagina = await browser.newPage();

  try {
    // traer tareas desde trello
    await obtieneTareaTrello(pagina);

    // selecciona aleatoriamente una línea de contenido para cada una de las 5 tareas
    const tareasSelec = selecTareaRandom(trelloTasks, 5);

    // inicia sesión en todoist
    await pagina.goto('https://app.todoist.com/auth/login');

    // encontrar y completar el textfield del correo
    const correoSelec = 'input[placeholder="Introduce tu email..."]';
    await pagina.waitForSelector(correoSelec);
    const correoUsuario = 'todoist@jlcornejo.com.mx';
    await pagina.type(correoSelec, correoUsuario);

    // encontrar y completar el textfield del password
    const selectorCorreo = 'input[placeholder="Introduce tu contraseña..."]';
    const userPassword = 'o?@b$#ysgk]f%T[5Fr';
    await pagina.type(selectorCorreo, userPassword);

    await Promise.all([
      pagina.waitForNavigation(),
      pagina.click('button[type="submit"]'),
    ]);

    // añadir tareas dede Trello a Todoist
    for (const task of tareasSelec) {
      await agregaTareaTrello(pagina, task.title, task.content[0]);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // cierra el navegador
    await browser.close();
  }
})();

// Obtienene las tareas desde Trello
async function obtieneTareaTrello(pagina) {
  await pagina.goto('https://trello.com/b/QvHVksDa/personal-work-goals');

  const [buttonOkay] = await pagina.$x("//button[contains(., 'Okay, got it')]");
  if (buttonOkay) {
    await buttonOkay.click();
  }

  global.trelloTasks = await pagina.evaluate(() => {
    const listHeaders = document.querySelectorAll('[data-testid^="list-header"]');
    const tasks = [];

    for (let i = 0; i < listHeaders.length; i++) {
      const listHeader = listHeaders[i];
      const title = listHeader.textContent.trim();
      const cardNames = listHeader.parentElement.querySelectorAll('[data-testid^="card-name"]');
      const content = Array.from(cardNames).map((cardName) => cardName.textContent.trim());

      tasks.push({ title, content });
    }

    return tasks;
  });
}

// Agrega tarea desde Trello a Todoist
async function agregaTareaTrello(pagina, taskContent, descriptionContent) {
  // Esperar a que aparezca el botón "Añadir tarea"
  await pagina.waitForSelector('button span:contains("Añadir tarea")');
  // Hacer clic en el botón "Añadir tarea"
  await pagina.click('button span:contains("Añadir tarea")');
  // Esperar a que aparezca el cuadro de texto de la tarea
  await pagina.waitForSelector('.task_editor__editing_area');
  // Escribir el contenido de la tarea de Trello en el cuadro de texto del nombre de la tarea
  await pagina.type('.task_editor__content_field--large-text [aria-label="Nombre de la tarea"] .tiptap.ProseMirror', taskContent);
  // Escribir el contenido de la descripción de la tarea en el cuadro de texto de la descripción
  await pagina.type('.task_editor__description_field [aria-label="Descripción"] .tiptap.ProseMirror', descriptionContent);
  await pagina.waitForSelector('button[type="submit"]');
  // Hacer clic en el botón para agregar la tarea
  await pagina.click('button[type="submit"]');
}

// función para seleccionar aleatoriamente tareas
function selecTareaRandom(tasks, count) {
  const tareasSelec = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * tasks.length);
    const randomTask = {
      title: tasks[randomIndex].title,
      content: [tasks[randomIndex].content[Math.floor(Math.random() * tasks[randomIndex].content.length)]],
    };
    tareasSelec.push(randomTask);
    tasks.splice(randomIndex, 1); // Eliminar la tarea seleccionada para evitar duplicados
  }
  return tareasSelec;
}
