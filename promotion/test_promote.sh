# This script is used on the dev box to push hangout to the test environment
cp -a /var/www/bga/hangout.xml /var/www/
sed -i 's/www\.anywhereboardgames\.com/capemay\.tcg\.com/g' /var/www/hangout.xml
cp -ar /var/www/bga/hangout /var/www/

