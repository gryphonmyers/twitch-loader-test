var gulp = require("gulp");
var browserify = require("browserify");
var jadeify = require("jadeify");
var parcelify = require("parcelify");
var source = require("vinyl-source-stream");
var jade = require("gulp-jade");
var watchify = require("watchify");
var gutil = require("gutil");
var path = require("path");
var uglifyify = require("uglifyify");
var cssmin = require("gulp-cssmin");
var uglify = require("gulp-uglify");
var buffer = require("vinyl-buffer");
var autoprefixer = require("gulp-autoprefixer");

var paths = {
    jadeTemplates: "./source/jade/templates/",
    public: "./public_html",
    bowerComponents: "./bower_components",
    nodeModules: "./node_modules",
    inputJS: "./source/js/",
    outputJS: './public_html/assets/js',
    outputCSS: "./public_html/assets/css/",
    inputPublic: "./source/public"
};

var filenames = {
    inputPublic: "**/*",
    jadeTemplates: "**/*.jade",
    outputJS: "bundle.js",
    inputJS: "app.js",
    outputCSS: "bundle.css"
};

gulp.task('minify-css', function() {
    return gulp.src(path.join(paths.outputCSS, filenames.outputCSS))
        .pipe(autoprefixer())
        .pipe(cssmin({
            keepSpecialComments: 0
        }))
        .pipe(gulp.dest(paths.outputCSS));
});

gulp.task('jade', function(){
    return gulp.src([path.join(paths.jadeTemplates, filenames.jadeTemplates)])
        .pipe(jade())
        .pipe(gulp.dest(paths.public));
});

gulp.task('browserify', function() {
    var b = watchify(browserify({
            entries: path.join(paths.inputJS, filenames.inputJS),
            paths: [paths.bowerComponents, paths.nodeModules],
            cache: {},
            packageCache: {}
        }))
        .transform(uglifyify, {
                global: true,
                sourceMap: false
            })
        .on('update', bundle)
        .on('log', gutil.log);
    var p = parcelify(b, {
            bundles: {
                style: path.join(paths.outputCSS, filenames.outputCSS)
            },
            watch: true
        })
        .on("error", function(e){
            console.log(e);
        })
        .on('assetUpdated', function( eventType, asset ){
            console.log("asset updated");
            gulp.start("minify-css");
        })
        .on("done", function(){
            console.log("done building styles");
            gulp.start("minify-css");
        });
    function bundle() {
        return b.bundle()
            .on('error', function(err){
                console.log(err.toString());
                this.emit('end');
            })
            .pipe(source(filenames.outputJS))
            .pipe(buffer())
            .pipe(uglify())
            .pipe(gulp.dest(paths.outputJS));
    }
    return bundle();
});

gulp.task("copy", function(){
    return gulp.src(path.join(paths.inputPublic, filenames.inputPublic))
        .pipe(gulp.dest(paths.public));
});

gulp.task("default", ["jade", "browserify", "copy"]);
