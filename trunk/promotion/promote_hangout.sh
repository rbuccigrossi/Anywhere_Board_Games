# This script is used on the dev box to push hangout to production copy
cp /var/www/bga/hangout.xml /var/www/anywhereboardgames/
cp -r /var/www/bga/hangout /var/www/anywhereboardgames/
rm -Rf /var/www/anywhereboardgames/hangout/.svn
/home/butch/sync_to_abg

