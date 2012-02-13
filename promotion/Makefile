TAG = v0.$(shell date +%y%m%d)

abg_${TAG}.tar.gz:  Makefile
	rm -rf foo
	mkdir foo
	cd foo; svn export https://boardgamearena.svn.sourceforge.net/svnroot/boardgamearena/trunk abg
	rm -Rf foo/abg/promotion
	chmod -R 777 foo/abg/server/data
	cd foo/abg; tar -zcf ../../abg_${TAG}.tar.gz *
	rm -Rf foo

