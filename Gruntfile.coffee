module.exports = (grunt) ->
  pkg = require './package.json'
  # configuration
  grunt.initConfig

    # grunt sass
    sass:
      compile:
        options:
          style: 'expanded'
          compress: true
        files: [
          expand: true
          cwd: 'src/scss'
          src: ['**/*.scss']
          dest: 'dist/'
          ext: '.css'
        ]

    # grunt coffee
#    coffee:
#      compile:
#        expand: true
#        cwd: 'src/coffee'
#        src: ['**/*.coffee']
#        dest: 'dist/js'
#        ext: '.js'
#        options:
#          join: true
#          bare: true
#          preserve_dirs: true

    coffee:
      compile:
        options:
          join: true
          bare: true
        files: [
          'dist/js/talos.js': ['src/*.coffee']
        ]

    copy:
      static:
        files: [
          expand: true
          flatten: true
          src: ['src/*.html']
          dest: 'dist/'
        ]
      dist:
        files: [
          expand: true
          flatten: true
          src: ['src/*.html', 'src/*.png', 'src/*.md']
          dest: 'dist/'
        ]
      talos_editor:
        files: [
          expand: true
          flatten: true
          src: ['dist/js/talos.js']
          dest: '../talos-editor/public/js'
        ]
    
    browserify:
      build:
        src: 'dist/talos.js',
        dest: 'dist/js/talos.all.js'

    uglify:
      js:
        files:
          'dist/js/talos.min.js': [
            'dist/js/talos.js'
          ]

    # grunt watch (or simply grunt)
    watch:
      js:
        files: ['src/*.coffee']
        tasks: ['build:js', 'copy:dist', 'copy:talos_editor']
      css:
        files: ['src/scss/*.scss']
        tasks: ['sass:compile']
      static:
        files: ['src/*.html','src/*.js','src/*.md']
        tasks: ['copy:static', 'copy:dist', 'copy:talos_editor']
      options:
        livereload: true

  # load plugins
  for name of pkg.devDependencies when name.substring(0, 6) is 'grunt-'
    grunt.loadNpmTasks name

  # tasks
  grunt.registerTask 'build:js', [
    'coffee:compile'
    'uglify:js'
  ]

  grunt.registerTask 'default', [
    'coffee:compile'
    'uglify:js'
    'sass:compile'
    'copy:static'
    'copy:dist'
  ]

