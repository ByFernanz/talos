test = null
test2 = null

regexLib =
	normal: /^[a-z][a-z_0-9]*\s{0,1}(.*)$/m,
	fixed: /^[0-9]+\s{0,1}(.*)$/m,
	ignored: /^[A-Z].*$/m,
	link:  /\[([^\[\]]+)\](?!\(|\:|{)/gm,
	div: /^(\:{3,}).*/m

parseText = (text) ->
	lines = text.split /\n|\r\n/
	yml = extractYAML lines
	blocks = extractBlocks lines
	#story = parseBlocks blocks
	return {yml, blocks}


extractYAML = (lines) ->
	ymlLines = []
	ymlBlock = ""
	firstLine = true
	ymlHead = false # para confirmar si existe un bloque YML
	for line in lines
		if firstLine and not ymlHead
			if line.startsWith "---"
				firstLine = false
				ymlHead = true
			else
				firstLine = false
		else if not firstLine and ymlHead
			if line.startsWith "---"
				firstLine = false
				ymlHead = false
			else
				ymlLines.push line
	for el in ymlLines
		ymlBlock += el + "\n"
	return ymlBlock


getBlockType = (section) ->
	if section.match(regexLib.normal)?
		return 'normal'
	else if section.match(regexLib.fixed)?
		return 'fixed'
	else if section.match(regexLib.ignored)?
		return 'ignored'

extractBlocks = (lines) ->
	blocks = []
	currentBlock = null
	for line in lines
		#match = line.match /^(#{1})\s+([^#].*)$/
		match = line.match /^(#{1})\s{1}([\p{Letter}\s\d\w]{0,}[\p{Letter}\d\w])/mu
		if match?
			if currentBlock != null
				blocks.push currentBlock 
			currentBlock =
				type: getBlockType match[2]
				name: match[2]
				lines: []
			matchTitle = line.match /"([^"]*)"/mu
			if matchTitle?
				currentBlock.title = matchTitle[1]
		else
			if currentBlock != null
				currentBlock.lines.push line
	if currentBlock != null
		blocks.push currentBlock
	return blocks

randomNum = (min, max) ->
    r = Math.random()*(max-min) + min
    return Math.floor(r)

toPDF = (html, meta) ->
	html = html.replace(/style='(.*?)'/gm, "")
	content = htmlToPdfmake(html, 
		defaultStyles:
			font: 'OpenSans'
			a:
				color: 'black'
				decoration: ''
				bold: true

			h1:
				alignment: 'center'
			h2:
				fontSize: 18
				alignment: 'center'
		)
	dd = 
		content: content
			

	pdfMake.createPdf(dd).download("#{meta.title}");
	
	


toHTML = (html, meta) ->
	html = """
		<!DOCTYPE html>
			<html lang="#{meta.lang}">
			<head>
    			<meta charset="UTF-8">
    			<meta http-equiv="X-UA-Compatible" content="IE=edge">
    			<meta name="viewport" content="width=device-width, initial-scale=1.0">
   				<title>#{meta.title}</title>
			</head>
			<body>
				#{html}
			</body>
		</html>
		"""
	return html

toEPUB = (html, meta) ->
	deltitles = html.split('\n')
	deltitles.splice(0,1)
	deltitles.splice(0,1)
	html = deltitles.join('\n')
	jepub = new jEpub()
	jepub.init({
		i18n: meta.lang,
		title: meta.title,
		author: meta.author,
		publisher: meta.publisher,
		description: meta.description,
		tags: meta.tags
	})
	jepub.date(new Date())
	#jepub.cover(data: object)
	jepub.add("Librojuego", html)
	#jepub.image(data: object, IMG_ID: string)
	blob = await jepub.generate("blob")
	fileNameToSaveAs = "#{meta.title}.epub"
	downloadLink = document.createElement("a")
	downloadLink.download = fileNameToSaveAs
	downloadLink.innerHTML = "Download File"
	if window.webkitURL?
		downloadLink.href = window.webkitURL.createObjectURL(blob)
	else
		downloadLink.href = window.URL.createObjectURL(blob)
		downloadLink.onclick = destroyClickedElement
		downloadLink.style.display = "none"
		document.body.appendChild(downloadLink)
	downloadLink.click()

toDOCX = (html, meta) ->
	doc = htmlDocx.asBlob(html)
	saveAs(doc,"#{meta.title}.docx")

saveTextFile = (doc, meta, ext) ->
	textToWrite = doc
	fileNameToSaveAs = "#{meta.title}.#{ext}"
	textFileAsBlob = new Blob([textToWrite], {type:'text/plain'})
	downloadLink = document.createElement("a")
	downloadLink.download = fileNameToSaveAs
	downloadLink.innerHTML = "Download File"
	if window.webkitURL?
		downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob)
	else
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob)
		downloadLink.onclick = destroyClickedElement
		downloadLink.style.display = "none"
		document.body.appendChild(downloadLink)
	downloadLink.click()

class Talos
	constructor: (
		@storySrc,
		@info,
		@settings
	) ->
		@converter = new markdownit({html: true}).use(window.markdownitEmoji)
		@yaml = null
		@src = ""
		@story = {}
		

		###
		# Configuracion del compilador cuando este terminado
		@settings.type = [classic, automated]
		@settings.mode = [book, app]
		@setting.appMode = [page, scroll]
		@settings.sections = [numbered, titled]
		@settings.output = [html,docx,epub, pdf]
		###
	
	compile: ( preview = "" ) ->
		###
		retornara un informe de errores y un archivo para descargar
		###
		# REINICIAR VARIABLES
		@info.html ""
		@info.html "#{@info.html()}<span><i>[0/8] Estableciendo configuración inicial...</i></span></br>"
		@story = JSON.parse(JSON.stringify(@storySrc))
		html = ""
		@yaml = null
		@src = ""

		# PROCESAMIENTO DE YML
		@info.html "#{@info.html()}<span><i>[1/8] Procesando cabecera del documento...</i></span></br>"
		@yaml = jsyaml.load(@story.yml)
		if not @yaml?
			@yaml = {}
		if @yaml.title?
			@src += "<h1 style='font-size: 2.5em; text-align: center; line-height: 1.2em;'>#{@yaml.title}</h1>\n\n"
		else
			@yaml.title = "Sin Título"
		
		if @yaml.author?
			@src += "<h1 style='font-style: italic; text-align: center;margin-bottom: 2em;line-height: 1.2em;'>#{@yaml.author}</h1>\n\n"
		else
			@yaml.author = "Anónimo"

		if !@yaml.lang?
			@yaml.lang = "es"
		
		if !@yaml.publisher?
			@yaml.publisher = ""

		if !@yaml.description?
			@yaml.description = ""
		
		if !@yaml.output?
			@yaml.output = "html"

		if !@yaml.tags?
			@yaml.tags = []

		if !@yaml.turn_to?
			@yaml.turn_to = ''
		else
			@yaml.turn_to = "#{@yaml.turn_to} "
		
		# GUARDAR SECCIONES FIJAS Y SU INDICE
		counterNormal = 0
		@info.html "#{@info.html()}<span><i>[2/8] Recolectando secciones fijas...</i></span></br>"
		fixedSections = []
		currentSection = null
		index = 0
		for el in @story.blocks
			if el.type is 'fixed'
				currentSection =
					blockIndex:	index
					number:  parseInt el.name
				if el.title
					currentSection.title = el.title
				fixedSections.push currentSection
			if el.type is 'normal'
				# Solo cuenta cuantas secciones normales hay
				counterNormal++
			index++

		# REMOVIENDO DIVS
		index = 0
		for el in @story.blocks
			indexL = 0
			for line in el.lines
				if line.match(regexLib.div)?
					@story.blocks[index].lines[indexL] = ""
				indexL++
			index++
		
		# ASIGNAR NUMEROS ALEATORIOS A LA SECCIONES
		@info.html "#{@info.html()}<span><i>[3/8] Asignando números aleatorios a las secciones no numeradas...</i></span></br>"
		listH = [] #guarda la lista total de encabezados
		mapSections = []
		currentSection = null
		index = 0
		indexFix = 0
		diff = 0
		min = 0
		max = 0
		num = []
		rev = 0
		for el in @story.blocks
			if el.type is 'fixed'
				listH.push el.name #guardar nombre
				if fixedSections[indexFix].number is parseInt el.name
					if fixedSections[indexFix + 1]?
						min = fixedSections[indexFix].number
						max = fixedSections[indexFix + 1].number
						# Diferencia de posicion en el index
						diff = (fixedSections[indexFix + 1].blockIndex - index) - 1
						rev = min + diff + 1
						if min > max
							@info.html "#{@info.html()}<span style='color: darkred;'>ERROR: El numero de la sección <b>#{min}</b> es mayor que el de la sección siguiente: <b>#{max}</b>.</span><br/>"
							return "<span style='color: darkred;'>ERROR: El numero de la sección <b>#{min}</b> es mayor que el de la sección siguiente: <b>#{max}</b>.</span><br/>"
						else if rev > max
							@info.html "#{@info.html()}<span style='color: darkred;'>ERROR: La cantidad de secciones anteriores a <b>#{max}</b> le superan por #{rev - max}.</span><br/>"
							return "<span style='color: darkred;'>ERROR: La cantidad de secciones anteriores a <b>#{max}</b> le superan por #{rev - max}.</span><br/>"
						else if max > rev
							@info.html "#{@info.html()}<span style='color: darkgoldenrod;'>ADVERTENCIA: La cantidad de secciones anteriores a <b>#{max}</b> son insuficientes, faltan #{max - rev}.</span><br/>"
					else
						diff = counterNormal
						max = counterNormal
						min = fixedSections[indexFix].number 
					count = min + 1
					num = []
					while count <= (min + diff)
						num.push count
						count++
				indexFix++
			else if el.type is 'normal'
					counterNormal = counterNormal - 1
					listH.push el.name #guardar nombre
					fix = randomNum(0, num.length)
					currentSection =
						name: el.name
						number: num[fix]
						index: index
					if el.title
						currentSection.title = el.title
					@story.blocks[index].name = String(num[fix])
					num.splice(fix, 1)
					mapSections.push currentSection
			index++
		
		# REVISAR SI SE REPITE UN ENCABEZADO
		index = 0
		index2 = 0
		listH2 = listH
		for h1 in listH
			index2 = 0
			for h2 in listH2
				if h1 is h2 and index != index2
					@info.html "#{@info.html()}<span style='color: darkred;'>ERROR: El nombre de la sección <b>#{h1}</b> se repite en otra sección.</span><br/>"
					return "<span style='color: darkred;'>ERROR: El nombre de la sección <b>#{h1}</b> se repite en otra sección.</span><br/>"
				index2++
			index++

		# CAMBIAR POR NUMEROS LOS ENLACES
		@info.html "#{@info.html()}<span><i>[4/8] Reasignando enlaces a las secciones numeradas...</i></span></br>"
		index = 0
		# Para guardar las secciones enlazadas
		linkedH = {}
		for el in @story.blocks
			indexL = 0
			newlines = []
			for line in el.lines
				matches = line.match(regexLib.link)
				if matches?
					for sec in matches
						content = sec.replace("[","")
						content = content.replace("]","")
						linkedH["#{content}"] = true
						linkedS = false # Para determinar si existe el objetivo del enlace
						for h in listH
							if h is content
								linkedS = true
						if !linkedS
							@info.html "#{@info.html()}<span style='color: darkgoldenrod;'>ADVERTENCIA: La sección <b>#{content}</b>  a la que apunta <b>#{@storySrc.blocks[index].name}</b> no existe.</span><br/>"
						if isNaN(content)
							for normal in mapSections
								if content is normal.name
									elem = normal
						else
							for fixed in fixedSections
								if parseInt(content) is fixed.number
									elem = fixed
						if elem?
							if @yaml.titled_sections and elem.title
								if @yaml.output is 'html' or @yaml.output is 'epub'
									line=line.replaceAll(sec, " #{@yaml.turn_to}[#{elem.title}](##{elem.number})")
								else
									line=line.replaceAll(sec, " **#{elem.title}** (#{@yaml.turn_to}[#{elem.number}](##{elem.number}))")
							else
								console.log(elem)
								test = mapSections
								line = line.replaceAll(sec, " #{@yaml.turn_to}[#{elem.number}](##{elem.number})")
						else
							line=line.replaceAll(sec, " #{@yaml.turn_to}[sección no definida](#no-definida)")
				@story.blocks[index].lines[indexL] = line
				indexL++
			index++

		# REVISAR SI ALGUNA SECCION SE ENCUENTRA NO ENLAZADA
		@info.html "#{@info.html()}<span><i>[5/8] Examinando si hay secciones huérfanas...</i></span></br>"
		orphans = []
		for sec in listH
			if !linkedH[sec]
				orphans.push sec
		if orphans
			for sec in orphans
				if sec != '1'
					@info.html "#{@info.html()}<span style='color: darkgoldenrod;'>ADVERTENCIA: Ningún enlace apunta a la sección <b>#{sec}</b>.</span><br/>"



		# ORDENAR E IMPRIMIR EN EL SRC
		@info.html "#{@info.html()}<span><i>[6/8] Organizando las secciones en orden secuencial...</i></span></br>"
		index = 0
		elsNorm = []
		for el in @story.blocks
			if el.type is "ignored"
				@src+="<h1 style='text-align: center;line-height: 1.2em;'>#{el.name}</h1>\n\n"
				for line in el.lines
					@src+="#{line}\n"
			else if el.type is "fixed"
				if elsNorm
					elsNorm.sort((a,b) ->
						if parseInt(a.name) > parseInt(b.name)
							return 1
						else
							return -1)
					for els in elsNorm
						if @yaml.titled_sections and els.title and not @yaml.hide_sections and (@yaml.output is 'html' or @yaml.output is 'epub')
							@src+="<h1 id='#{els.name}' name='#{els.name}' style='text-align: center;line-height: 1.2em;'>#{els.title}</h1>\n\n"
						else if @yaml.hide_sections and (@yaml.output is 'html' or @yaml.output is 'epub')
							@src+="<hr id='#{els.name}' name='#{els.name}'/>\n\n"
						else if not @yaml.hide_sections and @yaml.titled_sections and els.title and (@yaml.output is 'pdf' or @yaml.output is 'docx')
							@src+="<h1 id='#{els.name}' name='#{els.name}' style='text-align: center;line-height: 1.2em;'>#{els.name}</h1>\n\n<h2>#{els.title}</h2>\n\n"
						else
							@src+="<h1 id='#{els.name}' name='#{els.name}' style='text-align: center;line-height: 1.2em;'>#{els.name}</h1>\n\n"
						for line in els.lines
							@src+="#{line}\n"
				elsNorm = []
				if @yaml.titled_sections and el.title and not @yaml.hide_sections and (@yaml.output is 'html' or @yaml.output is 'epub')
					@src+="<h1 id='#{el.name}' name='#{el.name}' style='text-align: center;line-height: 1.2em;'>#{el.title}</h1>\n\n"
				else if @yaml.hide_sections and (@yaml.output is 'html' or @yaml.output is 'epub')
					@src+="<hr id='#{el.name}' name='#{el.name}'/>\n\n"
				else if not @yaml.hide_sections and @yaml.titled_sections and el.title and (@yaml.output is 'pdf' or @yaml.output is 'docx')
					@src+="<h1 id='#{el.name}' name='#{el.name}' style='text-align: center;line-height: 1.2em;'>#{el.name}</h1>\n\n<h2>#{el.title}</h2>\n\n"
				else
					@src+="<h1 id='#{el.name}' name='#{el.name}' style='text-align: center;line-height: 1.2em;'>#{el.name}</h1>\n\n"
				for line in el.lines
					@src+="#{line}\n"
			else if el.type is "normal"
				elsNorm.push el
			index++
		if elsNorm
			elsNorm.sort((a,b) ->
				if parseInt(a.name) > parseInt(b.name)
					return 1
				else
					return -1)
			for els in elsNorm
				if @yaml.titled_sections and els.title and not @yaml.hide_sections and (@yaml.output is 'html' or @yaml.output is 'epub')
					@src+="<h1 id='#{els.name}' name='#{els.name}' style='text-align: center;line-height: 1.2em;'>#{els.title}</h1>\n\n"
				else if @yaml.hide_sections and (@yaml.output is 'html' or @yaml.output is 'epub')
					@src+="<hr id='#{els.name}' name='#{els.name}'/>\n\n"
				else if not @yaml.hide_sections and @yaml.titled_sections and els.title and (@yaml.output is 'pdf' or @yaml.output is 'docx')
					@src+="<h1 id='#{els.name}' name='#{els.name}' style='text-align: center;line-height: 1.2em;'>#{els.name}</h1>\n\n<h2>#{els.title}</h2>\n\n"
				else
					@src+="<h1 id='#{els.name}' name='#{els.name}' style='text-align: center;line-height: 1.2em;'>#{els.name}</h1>\n\n"
				for line in els.lines
					@src+="#{line}\n"
		elsNorm = []

		

		# CONVERTIR MARKDOWN A HTML
		@info.html "#{@info.html()}<span><i>[7/8] Renderizando documento...</i></span></br>"
		html = @converter.render(@src)

		# SI SOLO ES PARA PREVIEW
		if preview is 'preview'
			@info.html "#{@info.html()}<span><i>[8/8] Visualizando documento en vista previa...</i></span></br>"
			return html
		else if preview is 'review'
			@info.html "#{@info.html()}<span><i>[8/8] Compilación exitosa...</i></span></br>"
			return html

		# GUARDAR EN DISTINTOS FORMATOS
		@info.html "#{@info.html()}<span><i>[8/8] Exportando el documento a formato <b>#{@yaml.output}</b>...</i></span></br>"
		if @yaml.output?
			if @yaml.output is 'pdf'
				toPDF(html, @yaml)
			else if @yaml.output is 'html'
				saveTextFile(toHTML(html, @yaml), @yaml,'html')
			else if @yaml.output is 'epub'
				toEPUB(html,@yaml)
			else if @yaml.output is 'docx'
				toDOCX(html,@yaml)
			else
				@info.html "#{@info.html}<span style='color: darkred;'>ERROR: El formato de salida <b>*.#{@yaml.output}</b> no está soportado por Talos. Pruebe con: html, epub, docx y pdf.</span></br>"
				return "<span style='color: darkred;'>ERROR: El formato de salida <b>*.#{@yaml.output}</b> no está soportado por Talos. Pruebe con: html, epub, docx y pdf.</span></br>"
		else
			saveTextFile(toHTML(html, @yaml), @yaml,'html')




				

		



