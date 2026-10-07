export default {

    async fetch(request, env){

        const url =
            new URL(request.url);


        /* =================================================
           CORS
        ================================================= */

        const cors = {

            "Access-Control-Allow-Origin":"*",

            "Access-Control-Allow-Methods":
                "POST, GET, OPTIONS",

            "Access-Control-Allow-Headers":
                "Content-Type, Authorization"
        };


        /* =================================================
           PREFLIGHT
        ================================================= */

        if(request.method === "OPTIONS"){

            return new Response(
                null,
                {
                    headers:cors
                }
            );
        }


        /* =================================================
           COLLECT
        ================================================= */

        if(
            request.method === "POST" &&
            url.pathname === "/collect"
        ){

            try{

                const body =
                    await request.json();


                /* =========================================
                   IP PENGUNJUNG
                ========================================= */

                const ip =
                    request.headers.get(
                        "CF-Connecting-IP"
                    ) || "unknown";


                /* =========================================
                   GEOLOCATION
                   BERDASARKAN IP
                ========================================= */

                let location = {

                    country:null,

                    city:null,

                    region:null,

                    timezone:null,

                    isp:null
                };


                if(
                    ip !== "unknown"
                ){

                    try{

                        const geoResponse =
                            await fetch(
                                "https://ipinfo.io/" +
                                encodeURIComponent(ip) +
                                "/json"
                            );


                        if(
                            geoResponse.ok
                        ){

                            const geo =
                                await geoResponse.json();


                            location = {

                                country:
                                    geo.country ||
                                    null,

                                city:
                                    geo.city ||
                                    null,

                                region:
                                    geo.region ||
                                    null,

                                timezone:
                                    geo.timezone ||
                                    null,

                                isp:
                                    geo.org ||
                                    null
                            };
                        }

                    }catch(error){

                        console.log(
                            "IP lookup gagal"
                        );
                    }
                }


                /* =========================================
                   RECORD
                ========================================= */

                const record = {

                    id:
                        crypto.randomUUID(),


                    name:
                        String(
                            body.name || ""
                        ).slice(0,50),


                    ip:
                        ip,


                    location:{

                        country:
                            location.country,

                        city:
                            location.city,

                        region:
                            location.region,

                        timezone:
                            location.timezone,

                        isp:
                            location.isp
                    },


                    device:{

                        browser:
                            body.browser ||
                            null,

                        language:
                            body.language ||
                            null,

                        platform:
                            body.platform ||
                            null,

                        online:
                            Boolean(
                                body.online
                            ),

                        cpuThreads:
                            body.cpuThreads ??
                            null,

                        memoryGB:
                            body.memoryGB ??
                            null,

                        touchPoints:
                            body.touchPoints ??
                            null,


                        screen:
                            body.screen ||
                            null,


                        timezone:
                            body.timezone ||
                            null,


                        darkMode:
                            body.darkMode ??
                            null,


                        reducedMotion:
                            body.reducedMotion ??
                            null,


                        battery:
                            body.battery ||
                            null
                    },


                    timestamp:
                        body.timestamp ||
                        new Date().toISOString()
                };


                /* =========================================
                   SIMPAN KE KV
                ========================================= */

                await env.VISITORS.put(

                    record.id,

                    JSON.stringify(record)
                );


                /* =========================================
                   RESPONSE
                ========================================= */

                return new Response(

                    JSON.stringify({
                        success:true
                    }),

                    {

                        status:200,

                        headers:{

                            ...cors,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );


            }catch(error){

                console.error(error);


                return new Response(

                    JSON.stringify({

                        success:false,

                        error:
                            "Invalid request"
                    }),

                    {

                        status:400,

                        headers:{

                            ...cors,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );
            }
        }


        /* =================================================
           ADMIN
        ================================================= */

        if(
            request.method === "GET" &&
            url.pathname === "/admin"
        ){

            const authorization =
                request.headers.get(
                    "Authorization"
                );


            /* =============================================
               CEK TOKEN ADMIN
            ============================================= */

            if(
                authorization !==
                `Bearer ${env.ADMIN_TOKEN}`
            ){

                return new Response(

                    "Unauthorized",

                    {
                        status:401,

                        headers:cors
                    }
                );
            }


            /* =============================================
               AMBIL DATA
            ============================================= */

            const list =
                await env.VISITORS.list();


            const results = [];


            for(
                const key of list.keys
            ){

                const value =
                    await env.VISITORS.get(
                        key.name
                    );


                if(value){

                    try{

                        results.push(
                            JSON.parse(value)
                        );

                    }catch(error){

                        console.log(
                            "Data rusak:",
                            key.name
                        );
                    }
                }
            }


            /* =============================================
               URUTKAN TERBARU
            ============================================= */

            results.sort(

                (a,b) =>

                    new Date(
                        b.timestamp
                    ) -

                    new Date(
                        a.timestamp
                    )
            );


            /* =============================================
               RESPONSE ADMIN
            ============================================= */

            return new Response(

                JSON.stringify(
                    results,
                    null,
                    2
                ),

                {

                    status:200,

                    headers:{

                        ...cors,

                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }


        /* =================================================
           DEFAULT
        ================================================= */

        return new Response(
            "Simple IP Checker API",
            {
                status:200
            }
        );
    }
};