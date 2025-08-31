const app = require('./app');
const { ensureAdminUser } = require('./utils/ensureAdmin');

app.listen(app.get('port'), async () => {
    console.log(`Server está corriendo en el puerto ${app.get('port')}`);
    await ensureAdminUser();
});