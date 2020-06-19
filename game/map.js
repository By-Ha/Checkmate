function generateRandomMap(player) {
    function rnd(num) {
        var t = Math.round(Math.random() * num);
        return (t == 0) ? num : t
    }
    function Astar(gm, x, y, tar_x, tar_y) {
        let vis = [];
        let q = [];
        let d = [[1, -1, 0, 0], [0, 0, 1, -1]];
        for (let i = 1; i <= size; ++i) vis[i] = [];
        q.push([x, y, 0]);
        vis[x][y] = 1;
        while (q.length > 0) {
            let tx = q[0][0], ty = q[0][1], step = q[0][2];
            q = q.slice(1);
            for (let j = 0; j < 4; ++j) {
                let tx2 = tx + d[0][j], ty2 = ty + d[1][j];
                if (tx2 > size || ty2 > size || tx2 <= 0 || ty2 <= 0 || gm[tx2][ty2].type == 4 || vis[tx2][ty2]) continue;
                vis[tx2][ty2] = 1;
                q.push([tx2, ty2, step + 1]);
                if (tx2 == tar_x && ty2 == tar_y)
                    return step + 1;
            }
        }
        return -1;
    }
    let gm = [];
    let size = 0;
    if (player == 2) size = 10;
    else size = 20;
    for (let i = 0; i <= size; ++i) {
        gm[i] = [];
        for (let j = 0; j <= size; ++j) {
            gm[i][j] = { "color": 0, "type": 0, "amount": 0 }; // 空白图
        }
    }
    gm[0][0] = { size: size };
    for (var i = 1; i <= 0.13 * size * size; ++i) {
        for (var tt = 1; tt <= 10; ++tt) rnd(size);
        var t1 = rnd(size),
            t2 = rnd(size);
        while (gm[t1][t2].type != 0) {
            t1 = rnd(size), t2 = rnd(size)
        }
        gm[t1][t2].type = 4
    }
    for (var i = 1; i <= 0.05 * size * size; ++i) {
        for (var tt = 1; tt <= 10; ++tt) rnd(size);
        var t1 = rnd(size),
            t2 = rnd(size);
        while (gm[t1][t2].type != 0) {
            t1 = rnd(size), t2 = rnd(size)
        }
        gm[t1][t2].type = 5;
        gm[t1][t2].amount = Number(rnd(10)) + 40;
    }
    let last = [];
    let calcTimes = 0;
    for (var i = 1; i <= player; ++i) {
        ++calcTimes;
        if (calcTimes >= 100) return generateRandomMap(player);
        var t1 = rnd(size - 2) + 1,
            t2 = rnd(size - 2) + 1;
        // 至少留一个方位有空
        while (gm[t1][t2].type != 0 || (gm[t1 + 1][t2].type != 0 && gm[t1 - 1][t2].type != 0 && gm[t1][t2 + 1].type != 0 && gm[t1][t2 + 1].type != 0)) {//  
            t1 = rnd(size - 2) + 1, t2 = rnd(size - 2) + 1;
        }

        if (i == 1) {
            gm[t1][t2].color = i;
            gm[t1][t2].amount = 1;
            gm[t1][t2].type = 1;
        } else {
            let flag = 0;
            for (let j = 0; j < last.length; ++j) {
                if (Astar(gm, t1, t2, last[j][0], last[j][1]) > 6) {
                    continue;
                }
                flag = 1;
                --i;
                break;
            }
            if (flag == 0) {
                gm[t1][t2].color = i;
                gm[t1][t2].amount = 1;
                gm[t1][t2].type = 1;
            }
        }
        last.push([t1, t2]);
    }
    return gm;
}

function generateMazeMap(player) {
    function rnd(num) {
        var t = Math.round(Math.random() * num);
        return (t == 0) ? num : t;
    }
    function Astar(gm, x, y, tar_x, tar_y) {
        let vis = [];
        let q = [];
        let d = [[1, -1, 0, 0], [0, 0, 1, -1]];
        for (let i = 1; i <= size; ++i) vis[i] = [];
        q.push([x, y, 0]);
        vis[x][y] = 1;
        while (q.length > 0) {
            let tx = q[0][0], ty = q[0][1], step = q[0][2];
            q = q.slice(1);
            for (let j = 0; j < 4; ++j) {
                let tx2 = tx + d[0][j], ty2 = ty + d[1][j];
                if (tx2 > size || ty2 > size || tx2 <= 0 || ty2 <= 0 || gm[tx2][ty2].type == 4 || vis[tx2][ty2]) continue;
                vis[tx2][ty2] = 1;
                q.push([tx2, ty2, step + 1]);
                if (tx2 == tar_x && ty2 == tar_y)
                    return step + 1;
            }
        }
        return -1;
    }
    let gm = [];
    let size = 0;
    let id = [];
    let etot = 0;
    let edges = [];
    let vtot = [];
    let venum = [];
    if (player == 2) size = 9;
    else size = 19;
    for (let i = 0; i <= size; ++i) {
        gm[i] = [];
        venum[i] = [];
        for (let j = 0; j <= size; ++j) {
            gm[i][j] = { "color": 0, "type": 0, "amount": 0 }; // 空白图
        }
    }
    gm[0][0] = { size: size };
    for (let i = 1; i <= size; ++i) {
        for (let j = 1; j <= size; ++j) {
            if (i % 2 == 0 && j % 2 == 0) {
                gm[i][j].type = 4;
            }
            if (i % 2 == 1 && j % 2 == 1) {
                venum[i][j] = vtot;
                ++vtot;
            }
        }
    }
    for (let i = 1; i <= size; ++i) {
        for (let j = 1; j <= size; ++j) {
            let tmp1 = i - 1, tmp3 = j - 1, tmp4 = j + 1;
            let tmp2 = i + 1;

            if (i % 2 == 0 && j % 2 == 1) {
                venum[i][j] = etot;
                edges[etot] = { "a": venum[tmp1][j], "b": venum[tmp2][j], "w": 10 + Number(rnd(10)), "posa": i, "posb": j };
                ++etot;
            }
            if (i % 2 == 1 && j % 2 == 0) {
                venum[i][j] = etot;
                edges[etot] = { "a": venum[i][tmp3], "b": venum[i][tmp4], "w": 10 + Number(rnd(10)), "posa": i, "posb": j };
                ++etot;
            }
        }
    }
    function cmp(x, y) {
        return x.w - y.w;
    }
    function find(x) {
        if (x == id[x]) return x;
        id[x] = find(id[x]);
        return id[x];
    }
    let hd = [];
    let es = [];
    let htot = 0;
    for (let i = 0; i < vtot; i++) {
        hd[i] = 0;
    }
    for (let i = 0; i < 2 * etot + 10; i++) {
        es[i] = { "t": 0, "nxt": 0 };
    }
    function addedge(u, v) {
        ++htot;
        es[htot].t = v;
        es[htot].nxt = hd[u];
        hd[u] = htot;
    }
    edges.sort(cmp);
    for (let i = 0; i < vtot; i++)id[i] = i;
    for (let i = 0; i < etot; i++) {
        if (find(edges[i].a) != find(edges[i].b)) {
            id[find(edges[i].a)] = id[find(edges[i].b)];
            addedge(edges[i].a + 1, edges[i].b + 1);
            addedge(edges[i].b + 1, edges[i].a + 1);
            gm[edges[i].posa][edges[i].posb].type = 5;
            gm[edges[i].posa][edges[i].posb].amount = edges[i].w;
        }
        else {
            gm[edges[i].posa][edges[i].posb].type = 4;
        }
    }
    if (Number(rnd(2)) == 1) {
        let fa = [], d = [], vst = [];
        let to = [];
        for (let i = 0; i < etot + 10; i++) {
            fa[i] = [];
            for (let j = 0; j <= 30; j++)fa[i][j] = 0;
        }
        function pw(a, p) {
            let ans = 1;
            for (let i = 1; i <= p; i++)ans = ans * a;
            return ans;
        }
        function dfs(x) {
            vst[x] = 1;
            for (let i = 1; pw(2, i) <= d[x]; i++) {
                fa[x][i] = fa[fa[x][i - 1]][i - 1];
            }
            for (let i = hd[x]; i > 0; i = es[i].nxt) {
                let y = es[i].t;
                if (vst[y] == 0) {
                    d[y] = d[x] + 1;
                    fa[y][0] = x;
                    dfs(y);
                }
            }
        }
        function lca(x, y) {
            if (d[x] < d[y]) {
                let wht = x;
                x = y;
                y = wht;
            }
            let dd = d[x] - d[y];
            for (let i = 0; i <= 30; i++)if (dd & pw(2, i)) x = fa[x][i];
            for (let i = 29; i >= 0; i--) {
                if (fa[x][i] != fa[y][i]) {
                    x = fa[x][i];
                    y = fa[y][i];
                }
            }
            if (x == y) return x;
            return fa[x][0];
        }
        function dst(x, y) {
            return d[x] + d[y] - 2 * d[lca(x, y)];
        }
        for (let i = 1; i <= vtot; i++)vst[i] = 0;
        d[10] = 0; fa[10][0] = 0; dfs(10);
        let ans1 = 0, ans2 = 0, tmp = 0;
        for (let i = 0; i < etot; i++) {
            let tmp2 = dst(edges[i].a + 1, edges[i].b + 1);
            if (tmp2 > tmp) {
                ans1 = edges[i].posa;
                ans2 = edges[i].posb;
                tmp = tmp2;
            }
        }
        gm[ans1][ans2].type = 5;
        gm[ans1][ans2].amount = 10 + Number(rnd(10));
    }
    let last = [];
    let calcTimes = 0;
    let calctimes2 = 0;
    for (var i = 1; i <= player; ++i) {
        ++calcTimes;
        if (calcTimes >= 100) return generateMazeMap(player);
        var t1 = rnd(size),
            t2 = rnd(size);
        while (1) {
            ++calctimes2;
            if (calctimes2 >= 100000) return generateMazeMap(player);
            t1 = rnd(size), t2 = rnd(size);
            let tmpcnt = 0;
            if (t1 - 1 >= 1) {
                if (gm[t1 - 1][t2].type != 4) {
                    tmpcnt++;
                }
            }
            if (t2 - 1 >= 1) {
                if (gm[t1][t2 - 1].type != 4) {
                    tmpcnt++;
                }
            }
            if (t1 + 1 <= size) {
                if (gm[t1 + 1][t2].type != 4) {
                    tmpcnt++;
                }
            }
            if (t2 + 1 <= size) {
                if (gm[t1][t2 + 1].type != 4) {
                    tmpcnt++;
                }
            }
            if (gm[t1][t2].type == 0 && tmpcnt == 1) break;
        }
        if (i == 1) {
            gm[t1][t2].color = i;
            gm[t1][t2].amount = 1;
            gm[t1][t2].type = 1;
        } else {
            let flag = 0;
            for (let j = 0; j < last.length; ++j) {
                if (Astar(gm, t1, t2, last[j][0], last[j][1]) > 9) {
                    continue;
                }
                flag = 1;
                --i;
                break;
            }
            if (flag == 0) {
                gm[t1][t2].color = i;
                gm[t1][t2].amount = 1;
                gm[t1][t2].type = 1;
            }
        }
        last.push([t1, t2]);
    }
    return gm;
}

function generateEmptyMap(player) {
    function rnd(num) {
        var t = Math.round(Math.random() * num);
        return (t == 0) ? num : t
    }
    function Astar(gm, x, y, tar_x, tar_y) {
        let vis = [];
        let q = [];
        let d = [[1, -1, 0, 0], [0, 0, 1, -1]];
        for (let i = 1; i <= size; ++i) vis[i] = [];
        q.push([x, y, 0]);
        vis[x][y] = 1;
        while (q.length > 0) {
            let tx = q[0][0], ty = q[0][1], step = q[0][2];
            q = q.slice(1);
            for (let j = 0; j < 4; ++j) {
                let tx2 = tx + d[0][j], ty2 = ty + d[1][j];
                if (tx2 > size || ty2 > size || tx2 <= 0 || ty2 <= 0 || gm[tx2][ty2].type == 4 || vis[tx2][ty2]) continue;
                vis[tx2][ty2] = 1;
                q.push([tx2, ty2, step + 1]);
                if (tx2 == tar_x && ty2 == tar_y)
                    return step + 1;
            }
        }
        return -1;
    }
    let gm = [];
    let size = 0;
    if (player == 2) size = 10;
    else size = 20;
    for (let i = 0; i <= size; ++i) {
        gm[i] = [];
        for (let j = 0; j <= size; ++j) {
            gm[i][j] = { "color": 0, "type": 0, "amount": 0 }; // 空白图
        }
    }
    gm[0][0] = { size: size };
    let last = [];
    let calcTimes = 0;
    for (var i = 1; i <= player; ++i) {
        ++calcTimes;
        if (calcTimes >= 100) return generateEmptyMap(player);
        var t1 = rnd(size - 2) + 1,
            t2 = rnd(size - 2) + 1;
        // 至少留一个方位有空
        while (gm[t1][t2].type != 0 || (gm[t1 + 1][t2].type != 0 && gm[t1 - 1][t2].type != 0 && gm[t1][t2 + 1].type != 0 && gm[t1][t2 + 1].type != 0)) {//  
            t1 = rnd(size - 2) + 1, t2 = rnd(size - 2) + 1;
        }

        if (i == 1) {
            gm[t1][t2].color = i;
            gm[t1][t2].amount = 1;
            gm[t1][t2].type = 1;
        } else {
            let flag = 0;
            for (let j = 0; j < last.length; ++j) {
                if (Astar(gm, t1, t2, last[j][0], last[j][1]) > 6) {
                    continue;
                }
                flag = 1;
                --i;
                break;
            }
            if (flag == 0) {
                gm[t1][t2].color = i;
                gm[t1][t2].amount = 1;
                gm[t1][t2].type = 1;
            }
        }
        last.push([t1, t2]);
    }
    return gm;
}

function generateMap(type, player) {
    console.log(type, player);
    let ti = new Date().getTime()
    if (type == 1) {
        console.log(new Date().getTime() - ti);
        return generateRandomMap(player);
    } else if (type == 2) {
        console.log(new Date().getTime() - ti);
        return generateMazeMap(player);
    } else if (type == 3) {
        console.log(new Date().getTime() - ti);
        return generateEmptyMap(player);
    } else {
        console.log(new Date().getTime() - ti);
        return generateRandomMap(player);
    }
}

module.exports = {
    generateMap
}