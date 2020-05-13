$(() => {
    let content = "";
    let loadingTag = false;

    $.fn.isInViewport = function () { var elementTop = $(this).offset().top; var elementBottom = elementTop + $(this).outerHeight(); var viewportTop = $(window).scrollTop(); var viewportBottom = viewportTop + $(window).height(); return elementBottom > viewportTop && elementTop < viewportBottom; };

    function show() {
        loadingTag = false;
        $(".preloader").removeClass("animate__fadeIn");
        $(".preloader").addClass("animate__animated animate__fadeOut");
        setTimeout(() => { $(".preloader").css('display', 'none'); }, 1000);
    }
    function hide() {
        $(".preloader").css('display', 'unset');
        $(".preloader").removeClass("animate__fadeOut");
        $(".preloader").addClass("animate__animated animate__fadeIn");
    }
    function confirm(type, title, content, callback) {
        $.confirm({
            type: type, title: title, content: content, theme: 'supervan', useBootstrap: false, draggable: false, backgroundDismiss: true, autoClose: 'close|10000',
            buttons: {
                tryAgain: { text: '确认', btnClass: 'btn-red', action: function () { callback(); return; } }, close: { text: '取消', action: function () { } }
            }
        });
    }

    function get(url, data, callback) {
        $.ajax({
            url: url, data: data, type: "get",
            error: function (request) { callback('err'); },
            success: function (data) {
                if (data.status == 'error') callback(data.msg);
                else callback(null, data);
            }
        });
    }

    function post(url, data, callback) {
        $.ajax({
            url: url, data: data, type: "post",
            error: function (request) { callback(request.msg); },
            success: function (data) {
                if (data.status == 'error') callback(data.msg);
                else callback(null, data);
            }
        });
    }

    function clearPage() {
        $(".page-wrap")[0].innerHTML = "";
        content = "";
    }

    function postPageAnction() {
        $(".loading-dot-container").css("display", "unset");
        $(".page-wrap .post i.ad-del").unbind("click");
        $(".page-wrap .post i.ad-del").click(function () {
            confirm('red', '确认删除?', '', () => {
                post('/api/deletepost', { pid: $(this.parentElement).attr('pid') }, (err, dat) => {
                    if (err) toast('error', '删除失败', '请重试或联系管理员');
                    else {
                        toast('success', '删除成功', '地球上又少了一点东西');
                        $(this.parentElement.parentElement).remove();
                    }
                })
            })
        })
        $(".page-wrap .post i.ad-edit").unbind("click");
        $(".page-wrap .post i.ad-edit").click(function () { // 获取edit页面
            hide();
            get('/admin/edit', { pid: $(this.parentElement).attr('pid') }, (err, dat) => {
                if (err) toast('error', '获取失败', '请重试或联系管理员');
                else {
                    $(".loading-dot-container").css("display", "none");
                    toast('success', '获取成功', '改成啥好呢?');
                    content = $(".page-wrap")[0].innerHTML;
                    $(".page-wrap")[0].innerHTML = dat;
                    show();
                    let md = window.markdownit();
                    let pre = $(".preview")[0];
                    pre.innerHTML = md.render($(".edit textarea")[0].value);
                    KaTeXReRender();
                    $(".edit textarea").bind('input propertychange', function () {
                        pre.innerHTML = md.render(this.value);
                        KaTeXReRender();
                    })
                    $(".edit .back").unbind("click");
                    $(".edit .back").click(() => {
                        hide();
                        if (content != "")
                            $(".page-wrap")[0].innerHTML = content;
                        else {
                            window.location.reload();
                            return;
                        }
                        content = "";
                        show();
                        postPageAnction();
                    })
                    $(".edit .save").unbind("click");
                    $(".edit .save").click(() => {
                        post('/api/updatepost', { pid: $(".edit").attr('pid'), content: $(".edit textarea")[0].value }, (err, dat) => {
                            if (err) toast('error', '保存失败', err);
                            else { toast('success', '保存成功', '好像还是没什么人看的样子'); content = ""; }
                        })
                    })
                }
            })
        })
    }

    function showPost(pid) {
        if (pid == 999999999) {
            $(".loading-dot")[0].innerHTML = '<style>.loader{position:absolute;top:50%;left:40%;margin-left:10%;-webkit-transform:translate3d(-50%,-50%,0);transform:translate3d(-50%,-50%,0)}.dot:nth-child(1){-webkit-animation-delay:.1s;animation-delay:.1s;background:#32bbff}.dot:nth-child(2){-webkit-animation-delay:.2s;animation-delay:.2s;background:#64bbff}.dot:nth-child(3){-webkit-animation-delay:.3s;animation-delay:.3s;background:#96bbff}.dot{width:8px;height:8px;background:#3ac;border-radius:100%;display:inline-block;-webkit-animation:slide 1s infinite;animation:slide 1s infinite;margin:0 10px}@keyframes slide{0%{-webkit-transform:scale(1);transform:scale(1)}50%{opacity:.3;-webkit-transform:scale(2);transform:scale(2)}100%{-webkit-transform:scale(1);transform:scale(1)}}</style><div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
            $(".loading-dot").removeClass('end');
        }
        content = "";
        get('/admin/post', { pid: pid }, (err, dat) => {
            show();
            if (err) toast('error', '获取失败', '请刷新或联系管理员');
            else {
                $(".page-wrap").append(dat);
                postPageAnction();
            }
            if (dat.length == 0) {
                $(".loading-dot")[0].innerHTML = "来到了世界的尽头";
                $(".loading-dot").addClass('end');
            }
        })
    }

    $("#left-bar .nav-link.post").click(() => {
        $(".loading-dot-container").css("display", "unset");
        clearPage();
        showPost(999999999);
    })

    $("#left-bar .nav-link.battle").click(() => {
        $(".loading-dot-container").css("display", "none");
        clearPage();
        get('/admin/battle', { page: 1 }, (err, dat) => {
            let ctxdata = [];
            $(".page-wrap")[0].innerHTML = dat;
            $(".battle .rating a").each(function (e) {
                ctxdata.splice(0, 0, Number(this.innerHTML));
            })
            var ctx = document.getElementById('myChart');
            var myLineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].splice(0, ctxdata.length),
                    datasets: [{
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 0.6)',
                        data: ctxdata,
                        label: 'Dataset',
                        fill: 'start'
                    }]
                },
                options: {
                    title: {
                        text: 'Rating变化图',
                        display: true
                    }
                }
            });
        })
    })

    $(window).scroll(function () {
        if (loadingTag) return;
        loadingTag = true;
        if ($(".loading-dot").isInViewport()) {
            if ($(".post:last").attr('pid') == undefined)
                showPost(999999999);
            else showPost($(".post:last").attr('pid'));
        } else loadingTag = false;
    })
    showPost(999999999);
})