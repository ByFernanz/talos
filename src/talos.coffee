regexLib =
	normal: /^[a-z][a-z_0-9]*\s{0,1}(.*)$/m,
	fixed: /^[0-9]+\s{0,1}(.*)$/m,
	ignored: /^[A-Z].*$/m

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
			@src += "<h1 style='font-size: 2.5em; text-align: center'>#{@yaml.title}</h1>\n"
		if @yaml.author?
			@src += "<h1 style='font-style: italic; text-align: center'>#{@yaml.author}</h1>\n"
		
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
			index +=1
		console.log(@src)
		console.log(fixedSections)
				

		



