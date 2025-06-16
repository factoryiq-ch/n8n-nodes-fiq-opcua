const path = require('path');
const { task, src, dest, series } = require('gulp');

task('copy:vendor', copyVendor);
task('build:icons', series(copyIcons, copyVendor));

task('default', series('build:icons'));

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource).pipe(dest(credDestination));
}

function copyVendor() {
	return src(path.resolve('vendor', '**', '*')).pipe(dest(path.resolve('dist', 'vendor')));
}
