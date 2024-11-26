function cap(){
    var alpha = [ 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
        'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
        '0','1','2','3','4','5','6','7','8','9',
        '!','@','#','$','%','^','&','*','+','?' ];
        var a = alpha[Math.floor(Math.random()*72)];
        var b = alpha[Math.floor(Math.random()*72)];
        var c = alpha[Math.floor(Math.random()*72)];
        var d = alpha[Math.floor(Math.random()*72)];
        var e = alpha[Math.floor(Math.random()*72)];
        var f = alpha[Math.floor(Math.random()*72)];

        var final = a+b+c+d+e+f;
        document.getElementById("capt").value=final;
}
function validcap(){
    var stg1 = document.getElementById('capt').value;
    var stg2 = document.getElementById('textinput').value;
    if (stg1==stg2){
        alert("Form is validated Successfully");
        return true;
    }
    else {
        alert("Please enter a valid captcha");
        return false;
    }
}
// Auto-refresh Captcha every 2 minutes
setInterval(cap, 120000); // 120000 ms = 2 minutes

// Initialize Captcha on page load
window.onload = cap;