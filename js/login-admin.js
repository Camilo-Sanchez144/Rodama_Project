const form = document.getElementById('form')
const user = document.getElementById('user')
const password = document.getElementById('password')
const eyeButton = document.getElementById('eye')

let eyeHidden = false

form.addEventListener('submit', (e)=>{
    e.preventDefault();
    console.log('user: ',user.value);
    console.log('password',password.value);
})
eyeButton.addEventListener('click',()=>{
    if(eyeHidden){
        eyeButton.className='bi-eye-slash'
        password.type = "password"
        eyeHidden = false
    }
    else if(!eyeHidden){
        eyeButton.className='bi-eye'
        password.type = "text"
        eyeHidden = true
    }
})