var Talos, extractBlocks, extractYAML, getBlockType, graph_book, parseText, randomNum, regexLib, saveTextFile, test, toDOCX, toEPUB, toHTML, toPDF;

test = null;

graph_book = "";

regexLib = {
  normal: /^[a-z][a-z_0-9]*\s{0,1}(.*)$/m,
  fixed: /^[0-9]+\s{0,1}(.*)$/m,
  ignored: /^[A-Z].*$/m,
  link: /\[([^\[\]]+)\](?!\(|\:|{)/gm,
  div: /^(\:{3,}).*/m
};

parseText = function(text) {
  var blocks, lines, procYML, yml;
  lines = text.split(/\n|\r\n/);
  procYML = extractYAML(lines);
  yml = procYML.ymlBlock;
  blocks = extractBlocks(procYML.cleanLines);
  //story = parseBlocks blocks
  return {yml, blocks};
};

extractYAML = function(lines) {
  var cleanLines, el, firstLine, i, j, len, len1, line, ymlBlock, ymlHead, ymlLines;
  ymlLines = [];
  ymlBlock = "";
  firstLine = true;
  cleanLines = [];
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
    } else {
      cleanLines.push(line);
    }
  }
  for (j = 0, len1 = ymlLines.length; j < len1; j++) {
    el = ymlLines[j];
    ymlBlock += el + "\n";
  }
  return {ymlBlock, cleanLines};
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
  var blocks, currentBlock, i, len, line, match, matchTitle;
  blocks = [];
  currentBlock = null;
  for (i = 0, len = lines.length; i < len; i++) {
    line = lines[i];
    //match = line.match /^(#{1})\s+([^#].*)$/
    match = line.match(/^(#{1})\s{1}([\p{Letter}\s\d\w]{0,}[\p{Letter}\d\w])/mu);
    if (match != null) {
      if (currentBlock !== null) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: getBlockType(match[2]),
        name: match[2],
        lines: []
      };
      matchTitle = line.match(/"([^"]*)"/mu);
      if (matchTitle != null) {
        currentBlock.title = matchTitle[1];
      }
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

toPDF = function(html, meta) {
  var content, dd;
  html = html.replace(/style='(.*?)'/gm, "");
  content = htmlToPdfmake(html, {
    defaultStyles: {
      font: 'OpenSans',
      a: {
        color: 'black',
        decoration: '',
        bold: true
      },
      h1: {
        alignment: 'center'
      },
      h2: {
        fontSize: 18,
        alignment: 'center'
      }
    }
  });
  dd = {
    content: content
  };
  return pdfMake.createPdf(dd).download(`${meta.title}`);
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
  html = `<!DOCTYPE html>
	<html lang="${meta.lang}">
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
   				<title>${meta.title}</title>
	</head>
	<body>
		${html}
	</body>
</html>`;
  doc = htmlDocx.asBlob(html);
  htmlDocx.asBlob(html);
  //saveAs(doc,"#{meta.title}.docx")
  return saveTextFile(doc, meta, "docx");
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
  constructor(storySrc, info, settings) {
    this.storySrc = storySrc;
    this.info = info;
    this.settings = settings;
    this.converter = new markdownit({
      html: true
    }).use(window.markdownitEmoji);
    this.yaml = null;
    this.src = "";
    this.story = {};
  }

  /*
   * Configuracion del compilador cuando este terminado
  @settings.type = [classic, automated]
  @settings.mode = [book, app]
  @setting.appMode = [page, scroll]
  @settings.sections = [numbered, titled]
  @settings.output = [html,docx,epub, pdf]
   */
  compile(preview = "") {
    var content, count, counterNormal, currentSection, diff, el, elem, els, elsNorm, fix, fixed, fixedSections, h, h1, h2, html, i, i1, index, index2, indexFix, indexL, j, j1, k, k1, l, l1, len, len1, len10, len11, len12, len13, len14, len15, len16, len17, len18, len19, len2, len20, len21, len3, len4, len5, len6, len7, len8, len9, line, linkedH, linkedS, listH, listH2, m, m1, mapSections, matches, max, min, n, newlines, normal, num, o, orphans, p, procYML, q, ref, ref1, ref10, ref11, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, rev, s, sec, t, u, v, w, x, y, z;
    /*
    retornara un informe de errores y un archivo para descargar
    */
    // REINICIAR VARIABLES
    graph_book = "";
    this.info.html("");
    this.info.html(`${this.info.html()}<span><i>[0/8] Estableciendo configuración inicial...</i></span></br>`);
    this.story = JSON.parse(JSON.stringify(this.storySrc));
    html = "";
    this.yaml = null;
    this.src = "";
    // PROCESAMIENTO DE YML
    this.info.html(`${this.info.html()}<span><i>[1/8] Procesando cabecera del documento...</i></span></br>`);
    this.yaml = jsyaml.load(this.story.yml);
    if (this.yaml == null) {
      this.yaml = {};
    }
    if (this.yaml.title != null) {
      this.src += `<h1 style='font-size: 2.5em; text-align: center; line-height: 1.2em;'>${this.yaml.title}</h1>\n\n`;
    } else {
      this.yaml.title = "Sin Título";
    }
    if (this.yaml.author != null) {
      this.src += `<h1 style='font-style: italic; text-align: center;margin-bottom: 2em;line-height: 1.2em;'>${this.yaml.author}</h1>\n\n`;
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
    if (this.yaml.output == null) {
      this.yaml.output = "html";
    }
    if (this.yaml.tags == null) {
      this.yaml.tags = [];
    }
    if (this.yaml.turn_to == null) {
      this.yaml.turn_to = '';
    } else {
      this.yaml.turn_to = `${this.yaml.turn_to} `;
    }
    
    // EXTRAER METADATOS DE LAS SECCIONES
    index = 0;
    ref = this.story.blocks;
    for (i = 0, len = ref.length; i < len; i++) {
      el = ref[i];
      if (el.type === 'fixed' || el.type === 'normal') {
        procYML = extractYAML(this.story.blocks[index].lines);
        this.story.blocks[index].yaml = jsyaml.load(procYML.ymlBlock);
        this.story.blocks[index].lines = procYML.cleanLines;
      }
      index++;
    }
    // GUARDAR SECCIONES FIJAS Y SU INDICE
    counterNormal = 0;
    this.info.html(`${this.info.html()}<span><i>[2/8] Recolectando secciones fijas...</i></span></br>`);
    fixedSections = [];
    currentSection = null;
    index = 0;
    ref1 = this.story.blocks;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      el = ref1[j];
      if (el.type === 'fixed') {
        currentSection = {
          blockIndex: index,
          number: parseInt(el.name)
        };
        if (el.title) {
          currentSection.title = el.title;
          this.story.blocks[index].yaml.title = el.title;
        } else if (el.yaml) {
          if (el.yaml.title) {
            currentSection.title = el.yaml.title;
            this.story.blocks[index].title = el.yaml.title;
          }
        }
        fixedSections.push(currentSection);
      }
      if (el.type === 'normal') {
        // Solo cuenta cuantas secciones normales hay
        counterNormal++;
      }
      index++;
    }
    // REMOVIENDO DIVS
    index = 0;
    ref2 = this.story.blocks;
    for (k = 0, len2 = ref2.length; k < len2; k++) {
      el = ref2[k];
      indexL = 0;
      ref3 = el.lines;
      for (l = 0, len3 = ref3.length; l < len3; l++) {
        line = ref3[l];
        if (line.match(regexLib.div) != null) {
          this.story.blocks[index].lines[indexL] = "";
        }
        indexL++;
      }
      index++;
    }
    
    // ASIGNAR NUMEROS ALEATORIOS A LA SECCIONES
    this.info.html(`${this.info.html()}<span><i>[3/8] Asignando números aleatorios a las secciones no numeradas...</i></span></br>`);
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
    ref4 = this.story.blocks;
    for (m = 0, len4 = ref4.length; m < len4; m++) {
      el = ref4[m];
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
              return `<span style='color: darkred;'>ERROR: El numero de la sección <b>${min}</b> es mayor que el de la sección siguiente: <b>${max}</b>.</span><br/>`;
            } else if (rev > max) {
              this.info.html(`${this.info.html()}<span style='color: darkred;'>ERROR: La cantidad de secciones anteriores a <b>${max}</b> le superan por ${rev - max}.</span><br/>`);
              return `<span style='color: darkred;'>ERROR: La cantidad de secciones anteriores a <b>${max}</b> le superan por ${rev - max}.</span><br/>`;
            } else if (max > rev) {
              this.info.html(`${this.info.html()}<span style='color: darkgoldenrod;'>ADVERTENCIA: La cantidad de secciones anteriores a <b>${max}</b> son insuficientes, faltan ${max - rev}.</span><br/>`);
            }
          } else {
            diff = counterNormal;
            max = counterNormal;
            min = fixedSections[indexFix].number;
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
        counterNormal = counterNormal - 1;
        listH.push(el.name); //guardar nombre
        fix = randomNum(0, num.length);
        currentSection = {
          name: el.name,
          number: num[fix],
          index: index
        };
        if (el.title) {
          currentSection.title = el.title;
          this.story.blocks[index].yaml.title = el.title;
        } else if (el.yaml) {
          if (el.yaml.title) {
            currentSection.title = el.yaml.title;
            this.story.blocks[index].title = el.yaml.title;
          }
        }
        this.story.blocks[index].name = String(num[fix]);
        num.splice(fix, 1);
        mapSections.push(currentSection);
      }
      index++;
    }
    
    // REVISAR SI SE REPITE UN ENCABEZADO
    index = 0;
    index2 = 0;
    listH2 = listH;
    for (n = 0, len5 = listH.length; n < len5; n++) {
      h1 = listH[n];
      index2 = 0;
      for (o = 0, len6 = listH2.length; o < len6; o++) {
        h2 = listH2[o];
        if (h1 === h2 && index !== index2) {
          this.info.html(`${this.info.html()}<span style='color: darkred;'>ERROR: El nombre de la sección <b>${h1}</b> se repite en otra sección.</span><br/>`);
          return `<span style='color: darkred;'>ERROR: El nombre de la sección <b>${h1}</b> se repite en otra sección.</span><br/>`;
        }
        index2++;
      }
      index++;
    }
    // CAMBIAR POR NUMEROS LOS ENLACES
    this.info.html(`${this.info.html()}<span><i>[4/8] Reasignando enlaces a las secciones numeradas...</i></span></br>`);
    index = 0;
    // Para guardar las secciones enlazadas
    linkedH = {};
    ref5 = this.story.blocks;
    for (p = 0, len7 = ref5.length; p < len7; p++) {
      el = ref5[p];
      indexL = 0;
      newlines = [];
      ref6 = el.lines;
      for (q = 0, len8 = ref6.length; q < len8; q++) {
        line = ref6[q];
        matches = line.match(regexLib.link);
        if (matches != null) {
          for (s = 0, len9 = matches.length; s < len9; s++) {
            sec = matches[s];
            content = sec.replace("[", "");
            content = content.replace("]", "");
            linkedH[`${content}`] = true;
            linkedS = false; // Para determinar si existe el objetivo del enlace
            for (t = 0, len10 = listH.length; t < len10; t++) {
              h = listH[t];
              if (h === content) {
                linkedS = true;
              }
            }
            if (!linkedS) {
              this.info.html(`${this.info.html()}<span style='color: darkgoldenrod;'>ADVERTENCIA: La sección <b>${content}</b>  a la que apunta <b>${this.storySrc.blocks[index].name}</b> no existe.</span><br/>`);
            }
            if (isNaN(content)) {
              for (u = 0, len11 = mapSections.length; u < len11; u++) {
                normal = mapSections[u];
                if (content === normal.name) {
                  elem = normal;
                }
              }
            } else {
              for (v = 0, len12 = fixedSections.length; v < len12; v++) {
                fixed = fixedSections[v];
                if (parseInt(content) === fixed.number) {
                  elem = fixed;
                }
              }
            }
            if (elem != null) {
              if (this.yaml.titled_sections && elem.title) {
                if (this.yaml.output === 'html' || this.yaml.output === 'epub') {
                  line = line.replaceAll(sec, ` ${this.yaml.turn_to}[${elem.title}](#${elem.number})`);
                } else {
                  line = line.replaceAll(sec, ` **${elem.title}** (${this.yaml.turn_to}[${elem.number}](#${elem.number}))`);
                }
              } else {
                line = line.replaceAll(sec, ` ${this.yaml.turn_to}[${elem.number}](#${elem.number})`);
              }
            } else {
              line = line.replaceAll(sec, ` ${this.yaml.turn_to}[sección no definida](#no-definida)`);
            }
          }
        }
        this.story.blocks[index].lines[indexL] = line;
        indexL++;
      }
      index++;
    }
    // REVISAR SI ALGUNA SECCION SE ENCUENTRA NO ENLAZADA
    this.info.html(`${this.info.html()}<span><i>[5/8] Examinando si hay secciones huérfanas...</i></span></br>`);
    orphans = [];
    for (w = 0, len13 = listH.length; w < len13; w++) {
      sec = listH[w];
      if (!linkedH[sec]) {
        orphans.push(sec);
      }
    }
    if (orphans) {
      for (x = 0, len14 = orphans.length; x < len14; x++) {
        sec = orphans[x];
        if (sec !== '1') {
          this.info.html(`${this.info.html()}<span style='color: darkgoldenrod;'>ADVERTENCIA: Ningún enlace apunta a la sección <b>${sec}</b>.</span><br/>`);
        }
      }
    }
    // ORDENAR E IMPRIMIR EN EL SRC
    this.info.html(`${this.info.html()}<span><i>[6/8] Organizando las secciones en orden secuencial...</i></span></br>`);
    index = 0;
    elsNorm = [];
    ref7 = this.story.blocks;
    for (y = 0, len15 = ref7.length; y < len15; y++) {
      el = ref7[y];
      if (el.type === "ignored") {
        this.src += `<h1 style='text-align: center;line-height: 1.2em;'>${el.name}</h1>\n\n`;
        ref8 = el.lines;
        for (z = 0, len16 = ref8.length; z < len16; z++) {
          line = ref8[z];
          this.src += `${line}\n`;
        }
      } else if (el.type === "fixed") {
        if (elsNorm) {
          elsNorm.sort(function(a, b) {
            if (parseInt(a.name) > parseInt(b.name)) {
              return 1;
            } else {
              return -1;
            }
          });
          for (i1 = 0, len17 = elsNorm.length; i1 < len17; i1++) {
            els = elsNorm[i1];
            if (this.yaml.titled_sections && els.title && !this.yaml.hide_sections && (this.yaml.output === 'html' || this.yaml.output === 'epub')) {
              this.src += `<h1 id='${els.name}' name='${els.name}' style='text-align: center;line-height: 1.2em;'>${els.title}</h1>\n\n`;
              graph_book += `# ${els.name}\n`;
            } else if (this.yaml.hide_sections && (this.yaml.output === 'html' || this.yaml.output === 'epub')) {
              this.src += `<hr id='${els.name}' name='${els.name}'/>\n\n`;
              graph_book += `# ${els.name}\n`;
            } else if (!this.yaml.hide_sections && this.yaml.titled_sections && els.title && (this.yaml.output === 'pdf' || this.yaml.output === 'docx')) {
              this.src += `<h1 id='${els.name}' name='${els.name}' style='text-align: center;line-height: 1.2em;'>${els.name}</h1>\n\n<h2>${els.title}</h2>\n\n`;
              graph_book += `# ${els.name}\n`;
            } else {
              this.src += `<h1 id='${els.name}' name='${els.name}' style='text-align: center;line-height: 1.2em;'>${els.name}</h1>\n\n`;
              graph_book += `# ${els.name}\n`;
            }
            ref9 = els.lines;
            for (j1 = 0, len18 = ref9.length; j1 < len18; j1++) {
              line = ref9[j1];
              this.src += `${line}\n`;
              graph_book += `${line}\n`;
            }
          }
        }
        elsNorm = [];
        if (this.yaml.titled_sections && el.title && !this.yaml.hide_sections && (this.yaml.output === 'html' || this.yaml.output === 'epub')) {
          this.src += `<h1 id='${el.name}' name='${el.name}' style='text-align: center;line-height: 1.2em;'>${el.title}</h1>\n\n`;
          graph_book += `# ${el.name}\n`;
        } else if (this.yaml.hide_sections && (this.yaml.output === 'html' || this.yaml.output === 'epub')) {
          this.src += `<hr id='${el.name}' name='${el.name}'/>\n\n`;
          graph_book += `# ${el.name}\n`;
        } else if (!this.yaml.hide_sections && this.yaml.titled_sections && el.title && (this.yaml.output === 'pdf' || this.yaml.output === 'docx')) {
          this.src += `<h1 id='${el.name}' name='${el.name}' style='text-align: center;line-height: 1.2em;'>${el.name}</h1>\n\n<h2>${el.title}</h2>\n\n`;
          graph_book += `# ${el.name}\n`;
        } else {
          this.src += `<h1 id='${el.name}' name='${el.name}' style='text-align: center;line-height: 1.2em;'>${el.name}</h1>\n\n`;
          graph_book += `# ${el.name}\n`;
        }
        ref10 = el.lines;
        for (k1 = 0, len19 = ref10.length; k1 < len19; k1++) {
          line = ref10[k1];
          this.src += `${line}\n`;
          graph_book += `${line}\n`;
        }
      } else if (el.type === "normal") {
        elsNorm.push(el);
      }
      index++;
    }
    if (elsNorm) {
      elsNorm.sort(function(a, b) {
        if (parseInt(a.name) > parseInt(b.name)) {
          return 1;
        } else {
          return -1;
        }
      });
      for (l1 = 0, len20 = elsNorm.length; l1 < len20; l1++) {
        els = elsNorm[l1];
        if (this.yaml.titled_sections && els.title && !this.yaml.hide_sections && (this.yaml.output === 'html' || this.yaml.output === 'epub')) {
          this.src += `<h1 id='${els.name}' name='${els.name}' style='text-align: center;line-height: 1.2em;'>${els.title}</h1>\n\n`;
          graph_book += `# ${els.name}\n`;
        } else if (this.yaml.hide_sections && (this.yaml.output === 'html' || this.yaml.output === 'epub')) {
          this.src += `<hr id='${els.name}' name='${els.name}'/>\n\n`;
          graph_book += `# ${els.name}\n`;
        } else if (!this.yaml.hide_sections && this.yaml.titled_sections && els.title && (this.yaml.output === 'pdf' || this.yaml.output === 'docx')) {
          this.src += `<h1 id='${els.name}' name='${els.name}' style='text-align: center;line-height: 1.2em;'>${els.name}</h1>\n\n<h2>${els.title}</h2>\n\n`;
          graph_book += `# ${els.name}\n`;
        } else {
          this.src += `<h1 id='${els.name}' name='${els.name}' style='text-align: center;line-height: 1.2em;'>${els.name}</h1>\n\n`;
          graph_book += `# ${els.name}\n`;
        }
        ref11 = els.lines;
        for (m1 = 0, len21 = ref11.length; m1 < len21; m1++) {
          line = ref11[m1];
          this.src += `${line}\n`;
          graph_book += `${line}\n`;
        }
      }
    }
    elsNorm = [];
    
    // CONVERTIR MARKDOWN A HTML
    this.info.html(`${this.info.html()}<span><i>[7/8] Renderizando documento...</i></span></br>`);
    html = this.converter.render(this.src);
    // SI SOLO ES PARA PREVIEW
    if (preview === 'preview') {
      this.info.html(`${this.info.html()}<span><i>[8/8] Visualizando documento en vista previa...</i></span></br>`);
      return html;
    } else if (preview === 'review') {
      this.info.html(`${this.info.html()}<span><i>[8/8] Compilación exitosa...</i></span></br>`);
      return html;
    }
    // GUARDAR EN DISTINTOS FORMATOS
    this.info.html(`${this.info.html()}<span><i>[8/8] Exportando el documento a formato <b>${this.yaml.output}</b>...</i></span></br>`);
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
        this.info.html(`${this.info.html}<span style='color: darkred;'>ERROR: El formato de salida <b>*.${this.yaml.output}</b> no está soportado por Talos. Pruebe con: html, epub, docx y pdf.</span></br>`);
        return `<span style='color: darkred;'>ERROR: El formato de salida <b>*.${this.yaml.output}</b> no está soportado por Talos. Pruebe con: html, epub, docx y pdf.</span></br>`;
      }
    } else {
      return saveTextFile(toHTML(html, this.yaml), this.yaml, 'html');
    }
  }

};
