var Talos, extractBlocks, extractYAML, getBlockType, parseText, randomNum, regexLib, saveTextFile, searchElem, test, toDOCX, toEPUB, toHTML, toPDF;

test = null;

regexLib = {
  normal: /^[a-z][a-z_0-9]*\s{0,1}(.*)$/m,
  fixed: /^[0-9]+\s{0,1}(.*)$/m,
  ignored: /^[A-Z].*$/m,
  link: /\[([^\[\]]+)\](?!\(|\:|{)/gm
};

parseText = function(text) {
  var blocks, lines, yml;
  lines = text.split(/\n|\r\n/);
  yml = extractYAML(lines);
  blocks = extractBlocks(lines);
  //story = parseBlocks blocks
  return {yml, blocks};
};

extractYAML = function(lines) {
  var el, firstLine, i, j, len, len1, line, ymlBlock, ymlHead, ymlLines;
  ymlLines = [];
  ymlBlock = "";
  firstLine = true;
  ymlHead = false; // para confirmar si existe un bloque YML
  for (i = 0, len = lines.length; i < len; i++) {
    line = lines[i];
    if (firstLine && !ymlHead) {
      if (line.startsWith("---")) {
        firstLine = false;
        ymlHead = true;
      } else {
        firstLine = false;
      }
    } else if (!firstLine && ymlHead) {
      if (line.startsWith("---")) {
        firstLine = false;
        ymlHead = false;
      } else {
        ymlLines.push(line);
      }
    }
  }
  for (j = 0, len1 = ymlLines.length; j < len1; j++) {
    el = ymlLines[j];
    ymlBlock += el + "\n";
  }
  return ymlBlock;
};

getBlockType = function(section) {
  if (section.match(regexLib.normal) != null) {
    return 'normal';
  } else if (section.match(regexLib.fixed) != null) {
    return 'fixed';
  } else if (section.match(regexLib.ignored) != null) {
    return 'ignored';
  }
};

extractBlocks = function(lines) {
  var blocks, currentBlock, i, len, line, match;
  blocks = [];
  currentBlock = null;
  for (i = 0, len = lines.length; i < len; i++) {
    line = lines[i];
    match = line.match(/^(#{1})\s+([^#].*)$/);
    if (match != null) {
      if (currentBlock !== null) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: getBlockType(match[2]),
        name: match[2],
        lines: []
      };
    } else {
      if (currentBlock !== null) {
        currentBlock.lines.push(line);
      }
    }
  }
  if (currentBlock !== null) {
    blocks.push(currentBlock);
  }
  return blocks;
};

randomNum = function(min, max) {
  var r;
  r = Math.random() * (max - min) + min;
  return Math.floor(r);
};

searchElem = function(sec, mapSections) {
  var el, i, len, name;
  for (i = 0, len = mapSections.length; i < len; i++) {
    el = mapSections[i];
    name = `[${el.name}]`;
    if (name === sec) {
      if (el != null) {
        return el.number;
      }
    }
  }
};

toPDF = function(html, meta) {
  var div, opt;
  html += "<style>body{font-size:1.3em;}a{color:black;font-weight:bold;text-decoration:none;pointer-events:none;}</style>";
  html = html.replace(/href=\"(.*?)\"/gm, "");
  div = document.createElement('div');
  div.id = 'content';
  div.innerHTML = html;
  opt = {
    filename: `${meta.title}.pdf`,
    image: {
      type: 'jpeg',
      quality: 0.98
    },
    html2canvas: {
      scale: 2
    },
    margin: 0.7,
    enableLinks: true,
    pagebreak: {
      mode: 'avoid-all'
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait'
    }
  };
  return html2pdf().set(opt).from(div).save();
};

toHTML = function(html, meta) {
  html = `<!DOCTYPE html>
	<html lang="${meta.lang}">
	<head>
    			<meta charset="UTF-8">
    			<meta http-equiv="X-UA-Compatible" content="IE=edge">
    			<meta name="viewport" content="width=device-width, initial-scale=1.0">
   				<title>${meta.title}</title>
	</head>
	<body>
		${html}
	</body>
</html>`;
  return html;
};

toEPUB = async function(html, meta) {
  var blob, deltitles, downloadLink, fileNameToSaveAs, jepub;
  deltitles = html.split('\n');
  deltitles.splice(0, 1);
  deltitles.splice(0, 1);
  html = deltitles.join('\n');
  jepub = new jEpub();
  jepub.init({
    i18n: meta.lang,
    title: meta.title,
    author: meta.author,
    publisher: meta.publisher,
    description: meta.description,
    tags: meta.tags
  });
  jepub.date(new Date());
  //jepub.cover(data: object)
  jepub.add("Librojuego", html);
  //jepub.image(data: object, IMG_ID: string)
  blob = (await jepub.generate("blob"));
  fileNameToSaveAs = `${meta.title}.epub`;
  downloadLink = document.createElement("a");
  downloadLink.download = fileNameToSaveAs;
  downloadLink.innerHTML = "Download File";
  if (window.webkitURL != null) {
    downloadLink.href = window.webkitURL.createObjectURL(blob);
  } else {
    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
  }
  return downloadLink.click();
};

toDOCX = function(html, meta) {
  var doc;
  doc = htmlDocx.asBlob(html);
  return saveAs(doc, `${meta.title}.docx`);
};

saveTextFile = function(doc, meta, ext) {
  var downloadLink, fileNameToSaveAs, textFileAsBlob, textToWrite;
  textToWrite = doc;
  fileNameToSaveAs = `${meta.title}.${ext}`;
  textFileAsBlob = new Blob([textToWrite], {
    type: 'text/plain'
  });
  downloadLink = document.createElement("a");
  downloadLink.download = fileNameToSaveAs;
  downloadLink.innerHTML = "Download File";
  if (window.webkitURL != null) {
    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
  } else {
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
  }
  return downloadLink.click();
};

Talos = class Talos {
  constructor(story, settings) {
    this.story = story;
    this.settings = settings;
    this.converter = new markdownit({
      html: true
    });
    this.container = $("#talos-play");
    this.info = $("#talos-info");
    this.keywords = {};
    this.history = {};
    this.yaml;
    this.src = "";
    this.currentSection = null;
  }

  /*
   * Configuracion del compilador
  @settings.type = [classic, automated]
  @settings.mode = [book, app]
  @setting.appMode = [page, scroll]
  @settings.sections = [numbered, titled]
  @settings.output = [html,rtf]
   */
  play() {
    /*
    reproducira el juego en el contenedor para testear
    */
    return console.log("test");
  }

  compile() {
    var content, count, currentSection, diff, el, els, elsNorm, fix, fixedSections, h, html, i, index, indexFix, indexL, j, k, l, len, len1, len10, len11, len12, len2, len3, len4, len5, len6, len7, len8, len9, line, linkedH, linkedS, listH, m, mapSections, matches, max, min, n, newlines, num, number, o, orphans, p, q, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, rev, s, sec, t, u, v;
    /*
    retornara un informe de errores y un archivo para descargar
    */
    // LIMPIAR CONSOLA DE INFORMACION
    this.info.html("");
    // PROCESAMIENTO DE YML
    this.yaml = jsyaml.load(this.story.yml);
    if (this.yaml.title != null) {
      this.src += `<h1 style='font-size: 2.5em; text-align: center'>${this.yaml.title}</h1>\n\n`;
    } else {
      this.yaml.title = "Sin Título";
    }
    if (this.yaml.author != null) {
      this.src += `<h1 style='font-style: italic; text-align: center;margin-bottom: 2em;'>${this.yaml.author}</h1>\n\n`;
    } else {
      this.yaml.author = "Anónimo";
    }
    if (this.yaml.lang == null) {
      this.yaml.lang = "es";
    }
    if (this.yaml.publisher == null) {
      this.yaml.publisher = "";
    }
    if (this.yaml.description == null) {
      this.yaml.description = "";
    }
    if (this.yaml.tags == null) {
      this.yaml.tags = [];
    }
    if (this.yaml.turn_to == null) {
      this.yaml.turn_to = '';
    } else {
      this.yaml.turn_to = ` ${this.yaml.turn_to} `;
    }
    
    // GUARDAR SECCIONES FIJAS Y SU INDICE
    fixedSections = [];
    currentSection = null;
    index = 0;
    ref = this.story.blocks;
    for (i = 0, len = ref.length; i < len; i++) {
      el = ref[i];
      if (el.type === 'fixed') {
        currentSection = {
          blockIndex: index,
          number: parseInt(el.name)
        };
        fixedSections.push(currentSection);
      }
      index++;
    }
    
    // ASIGNAR NUMEROS ALEATORIOS A LA SECCIONES
    listH = []; //guarda la lista total de encabezados
    mapSections = [];
    currentSection = null;
    index = 0;
    indexFix = 0;
    diff = 0;
    min = 0;
    max = 0;
    num = [];
    rev = 0;
    ref1 = this.story.blocks;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      el = ref1[j];
      if (el.type === 'fixed') {
        listH.push(el.name); //guardar nombre
        if (fixedSections[indexFix].number === parseInt(el.name)) {
          if (fixedSections[indexFix + 1] != null) {
            min = fixedSections[indexFix].number;
            max = fixedSections[indexFix + 1].number;
            // Diferencia de posicion en el index
            diff = (fixedSections[indexFix + 1].blockIndex - index) - 1;
            rev = min + diff + 1;
            if (min > max) {
              this.info.html(`${this.info.html()}<span style='color: darkred;'>ERROR: El numero de la sección <b>${min}</b> es mayor que el de la sección siguiente: <b>${max}</b>.</span><br/>`);
              return this.info.text();
            } else if (rev > max) {
              this.info.html(`${this.info.html()}<span style='color: darkred;'>ERROR: La cantidad de secciones anteriores a <b>${max}</b> le superan por ${rev - max}.</span><br/>`);
              return this.info.text();
            } else if (max > rev) {
              this.info.html(`${this.info.html()}<span style='color: darkyellow;'>ADVERTENCIA: La cantidad de secciones anteriores a <b>${max}</b> son insuficientes, faltan ${max - rev}.</span><br/>`);
            }
          } else {
            diff = this.story.blocks.length - fixedSections[indexFix].number;
            max = this.story.blocks.length;
          }
          count = min + 1;
          num = [];
          while (count <= (min + diff)) {
            num.push(count);
            count++;
          }
        }
        indexFix++;
      } else if (el.type === 'normal') {
        listH.push(el.name); //guardar nombre
        fix = randomNum(0, num.length);
        currentSection = {
          name: el.name,
          number: num[fix],
          index: index
        };
        this.story.blocks[index].name = String(num[fix]);
        num.splice(fix, 1);
        mapSections.push(currentSection);
      }
      index++;
    }
    
    // CAMBIAR POR NUMEROS LOS ENLACES
    index = 0;
    // Para guardar las secciones enlazadas
    linkedH = {};
    ref2 = this.story.blocks;
    for (k = 0, len2 = ref2.length; k < len2; k++) {
      el = ref2[k];
      indexL = 0;
      newlines = [];
      ref3 = el.lines;
      for (l = 0, len3 = ref3.length; l < len3; l++) {
        line = ref3[l];
        matches = line.match(regexLib.link);
        if (matches != null) {
          for (m = 0, len4 = matches.length; m < len4; m++) {
            sec = matches[m];
            content = sec.replace("[", "");
            content = content.replace("]", "");
            linkedH[`${content}`] = true;
            linkedS = false; // Para determinar si existe el objetivo del enlace
            for (n = 0, len5 = listH.length; n < len5; n++) {
              h = listH[n];
              if (h === content) {
                linkedS = true;
              }
            }
            if (!linkedS) {
              this.info.html(`${this.info.html()}<span style='color: darkyellow;'>ADVERTENCIA: La sección <b>${content}</b>  a la que apunta <b>${el.name}</b> no existe.</span><br/>`);
            }
            if (isNaN(content)) {
              number = searchElem(sec, mapSections);
            } else {
              number = content;
            }
            line = line.replaceAll(sec, `${this.yaml.turn_to}[${number}](#${number})`);
          }
        }
        this.story.blocks[index].lines[indexL] = line;
        indexL++;
      }
      index++;
    }
    // REVISAR SI ALGUNA SECCION SE ENCUENTRA NO ENLAZADA
    orphans = [];
    for (o = 0, len6 = listH.length; o < len6; o++) {
      sec = listH[o];
      if (!linkedH[sec]) {
        orphans.push(sec);
      }
    }
    if (orphans) {
      for (p = 0, len7 = orphans.length; p < len7; p++) {
        sec = orphans[p];
        if (sec !== '1') {
          this.info.html(`${this.info.html()}<span style='color: darkyellow;'>ADVERTENCIA: Ningún enlace apunta a la sección <b>${sec}</b>.</span><br/>`);
        }
      }
    }
    // ORDENAR E IMPRIMIR EN EL SRC
    index = 0;
    elsNorm = [];
    ref4 = this.story.blocks;
    for (q = 0, len8 = ref4.length; q < len8; q++) {
      el = ref4[q];
      if (el.type === "ignored") {
        this.src += `<h1 style='text-align: center;'>${el.name}</h1>\n\n`;
        ref5 = el.lines;
        for (s = 0, len9 = ref5.length; s < len9; s++) {
          line = ref5[s];
          this.src += `${line}\n`;
        }
      } else if (el.type === "fixed") {
        if (elsNorm != null) {
          elsNorm.sort(function(a, b) {
            if (parseInt(a.name) > parseInt(b.name)) {
              return 1;
            } else {
              return -1;
            }
          });
          for (t = 0, len10 = elsNorm.length; t < len10; t++) {
            els = elsNorm[t];
            this.src += `<h1 id='${els.name}' name='${els.name}' style='text-align: center;'>${els.name}</h1>\n\n`;
            ref6 = els.lines;
            for (u = 0, len11 = ref6.length; u < len11; u++) {
              line = ref6[u];
              this.src += `${line}\n`;
            }
          }
        }
        elsNorm = [];
        this.src += `<h1 id='${el.name}' name='${el.name}' style='text-align: center;'>${el.name}</h1>\n\n`;
        ref7 = el.lines;
        for (v = 0, len12 = ref7.length; v < len12; v++) {
          line = ref7[v];
          this.src += `${line}\n`;
        }
      } else if (el.type === "normal") {
        elsNorm.push(el);
      }
      // como ordenar elementos renumerados
      index++;
    }
    
    // CONVERTIR MARKDOWN A HTML
    html = this.converter.render(this.src);
    // GUARDAR EN DISTINTOS FORMATOS
    if (this.yaml.output != null) {
      if (this.yaml.output === 'pdf') {
        return toPDF(html, this.yaml);
      } else if (this.yaml.output === 'html') {
        return saveTextFile(toHTML(html, this.yaml), this.yaml, 'html');
      } else if (this.yaml.output === 'epub') {
        return toEPUB(html, this.yaml);
      } else if (this.yaml.output === 'docx') {
        return toDOCX(html, this.yaml);
      } else {
        return this.info.html(`${this.info.html}<span style='color: darkred;'>ERROR: El formato de salida <b>*.${this.yaml.output}</b> no está soportado por Talos. Pruebe con: html, epub, docx y pdf.</span></br>`);
      }
    } else {
      return saveTextFile(toHTML(html, this.yaml), this.yaml, 'html');
    }
  }

};
