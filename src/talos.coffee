test = null

regexLib =
	normal: /^[a-z][a-z_0-9]*\s{0,1}(.*)$/m,
	fixed: /^[0-9]+\s{0,1}(.*)$/m,
	ignored: /^[A-Z].*$/m,
	link:  /\[([^\[\]]+)\](?!\(|\:|{)/gm

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
		match = line.match /^(#{1})\s+([^#].*)$/
		if match?
			if currentBlock != null
				blocks.push currentBlock
			currentBlock =
				type: getBlockType match[2]
				name: match[2]
				lines: []
		else
			if currentBlock != null
				currentBlock.lines.push line
	if currentBlock != null
		blocks.push currentBlock
	return blocks

randomNum = (min, max) ->
    r = Math.random()*(max-min) + min
    return Math.floor(r)

searchElem = (sec, mapSections) ->
	for el in mapSections
		name = "[#{el.name}]"
		if name is sec
			if el?
				console.log(el.name)
				console.log(el.number)
				return el.number

toPDF = (html, meta) ->
	html += "<style>body{font-size:1.3em;}a{color:black;font-weight:bold;text-decoration:none;pointer-events:none;}</style>"
	html = html.replace(/href=\"(.*?)\"/gm,"")
	div = document.createElement('div')
	div.id = 'content'
	div.innerHTML = html
	opt =
		filename:     "#{meta.title}.pdf"
		image:        { type: 'jpeg', quality: 0.98 }
		html2canvas:  { scale: 2 }
		margin: 0.7
		enableLinks: true
		pagebreak:
			mode: 'avoid-all'
		jsPDF:       
			unit: 'in'
			format: 'letter'
			orientation: 'portrait'
	html2pdf().set(opt).from(div).save()

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
		@story,
		@settings
	) ->
		@converter = new markdownit({html: true})
		@container = $("#talos-play")
		@keywords = {}
		@history = {}
		@yaml
		@src = ""
		@currentSection = null

		###
		# Configuracion del compilador
		@settings.type = [classic, automated]
		@settings.mode = [book, app]
		@setting.appMode = [page, scroll]
		@settings.sections = [numbered, titled]
		@settings.output = [html,rtf]
		###

	play: ->
		###
		reproducira el juego en el contenedor para testear
		###
		console.log "test"
	
	compile: ->
		###
		retornara un informe de errores y un archivo para descargar
		###

		# PROCESAMIENTO DE YML
		@yaml = jsyaml.load(@story.yml)
		if @yaml.title?
			@src += "<h1 style='font-size: 2.5em; text-align: center'>#{@yaml.title}</h1>\n\n"
		else
			@yaml.title = "Sin Título"
		
		if @yaml.author?
			@src += "<h1 style='font-style: italic; text-align: center;margin-bottom: 2em;'>#{@yaml.author}</h1>\n\n"
		else
			@yaml.author = "Anónimo"

		if !@yaml.lang?
			@yaml.lang = "es"
		
		if !@yaml.publisher?
			@yaml.publisher = ""

		if !@yaml.description?
			@yaml.description = ""

		if !@yaml.tags?
			@yaml.tags = []

		if !@yaml.turn_to?
			@yaml.turn_to = ''
		else
			@yaml.turn_to = " #{@yaml.turn_to} "
		
		# GUARDAR SECCIONES FIJAS Y SU INDICE
		fixedSections = []
		currentSection = null
		index = 0
		for el in @story.blocks
			if el.type is 'fixed'
				currentSection =
					blockIndex:	index
					number:  parseInt el.name
				fixedSections.push currentSection
			index++
		
		# ASIGNAR NUMEROS ALEATORIOS A LA SECCIONES
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
				if fixedSections[indexFix].number is parseInt el.name
					if fixedSections[indexFix + 1]?
						min = fixedSections[indexFix].number
						max = fixedSections[indexFix + 1].number
						# Diferencia de posicion en el index
						diff = (fixedSections[indexFix + 1].blockIndex - index) - 1
						rev = min + diff + 1
						if rev > max
							console.log("ERROR: La cantidad de secciones supera el numero fijo")
							break
					else
						diff = @story.blocks.length - fixedSections[indexFix].number
						max = @story.blocks.length
					count = min + 1
					num = []
					while count <= (min + diff)
						num.push count
						count++	
				indexFix++
			else if el.type is 'normal'
					fix = randomNum(0, num.length)
					currentSection =
						name: el.name
						number: num[fix]
						index: index
					@story.blocks[index].name = String(num[fix])
					num.splice(fix, 1)
					mapSections.push currentSection
			index++

			
		# CAMBIAR POR NUMEROS LOS ENLACES
		index = 0
		for el in @story.blocks
			indexL = 0
			newlines = []
			for line in el.lines
				matches = line.match(regexLib.link)
				if matches?
					for sec in matches
						content = sec.replace("[","")
						content = content.replace("]","")
						if isNaN(content)
							number = searchElem(sec, mapSections)
						else
							number = content
						line=line.replaceAll(sec, "#{@yaml.turn_to}[#{number}](##{number})")
				@story.blocks[index].lines[indexL] = line
				indexL++
			index++
		console.log(@story.blocks)

		# ORDENAR E IMPRIMIR EN EL SRC
		index = 0
		elsNorm = []
		for el in @story.blocks
			if el.type is "ignored"
				@src+="<h1 style='text-align: center;'>#{el.name}</h1>\n\n"
				for line in el.lines
					@src+="#{line}\n"
			else if el.type is "fixed"
				if elsNorm?
					elsNorm.sort((a,b) ->
						if parseInt(a.name) > parseInt(b.name)
							return 1
						else
							return -1)
					for els in elsNorm
						@src+="<h1 id='#{els.name}' name='#{els.name}' style='text-align: center;'>#{els.name}</h1>\n\n"
						for line in els.lines
							@src+="#{line}\n"
				elsNorm = []
				@src+="<h1 id='#{el.name}' name='#{el.name}' style='text-align: center;'>#{el.name}</h1>\n\n"
				for line in el.lines
					@src+="#{line}\n"
			else if el.type is "normal"
				elsNorm.push el
				# como ordenar elementos renumerados
			index++
		console.log(@src)
		

		# CONVERTIR MARKDOWN A HTML
		html = @converter.render(@src)

		# GUARDAR EN DISTINTOS FORMATOS
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
				console.log("El formato de salida *.#{@yaml.output} no está soportado por Talos.\n\nLos formatos soportados son: html, epub, docx y pdf.")
		else
			saveTextFile(toHTML(html, @yaml), @yaml,'html')




				

		



