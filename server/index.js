const app = require('./app');

app.listen(app.get('port'), () => {
    console.log(`Server está corriendo en el puerto ${app.get('port')}`);
});