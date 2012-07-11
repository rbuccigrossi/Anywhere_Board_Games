# This script is used on the dev box to push hangout to production copy
cp -a /var/www/bga/hangout.xml /var/www/anywhereboardgames/
cp -ar /var/www/bga/hangout /var/www/anywhereboardgames/
rm -Rf /var/www/anywhereboardgames/hangout/.svn
/home/butch/sync_to_abg

