TAG=v0.111220

abg_${TAG}.tar.gz:  Makefile
	rm -rf foo
	mkdir foo
	cd foo; svn export https://boardgamearena.svn.sourceforge.net/svnroot/boardgamearena/branches/html5 abg
	rm -Rf foo/abg/promotion
	cd foo/abg; tar -zcf ../../abg_${TAG}.tar.gz *
	rm -Rf foo

