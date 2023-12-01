const gulp = require('gulp');
const cleanCSS = require('gulp-clean-css');
const sass = require('gulp-sass')(require('sass'));
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');

// SASS compilation
gulp.task('sass', function() {
    return gulp.src('scss/*sidebar.scss')
        .pipe(sass())
        .on('error', sass.logError)
        .pipe(gulp.dest('css'));
});

// Minify JS + CSS
gulp.task('minify:js', function() {
  return gulp.src('js/*sidebar.js')
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify())
    .pipe(gulp.dest('js'));
});

gulp.task('minify:css', gulp.series('sass', function() {
  return gulp.src('css/*sidebar.css')
    .pipe(rename({ suffix: '.min' }))
    .pipe(cleanCSS({level: 2}))
    .pipe(gulp.dest('css'));
}));

gulp.task('minify', gulp.parallel('minify:js', 'minify:css'));

// Watch JS + CSS Files
gulp.task('watch', gulp.series('minify', function() {
  gulp.watch('js/*.js', ['minify:js']);
  gulp.watch('scss/*.scss', ['minify:css']);
}));

// Default
gulp.task('default', gulp.series('minify'));
