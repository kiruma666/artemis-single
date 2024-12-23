/**
 * @Author: sheldon
 * @Date: 2024-06-11 20:31:42
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-12 01:35:03
 */

import {Select, Modal, Button} from 'antd';
import {useCallback, useEffect, useState} from 'react';
import {Container} from 'theme-ui';

enum Version {
    v3AutoBind = 'v3AutoBind',
    v3MannualInvoke = 'v3MannualInvoke',
    v2CheckboxAutoRender = 'v2CheckboxAutoRender',
    v2CheckboxExplicitRender = 'v2CheckboxExplicitRender',
    v2InvisibleAutoBind = 'v2InvisibleAutoBind',
    v2InvisibleManualBind = 'v2InvisibleManualBind',
    v2InvisibleManualInvoke = 'v2InvisibleManualInvoke'
}

const RecaptchaScriptUrl = 'https://www.google.com/recaptcha/api.js';
const RecaptchaSiteKey = '6Ld2APYpAAAAAIMfUEVLTaf4rkAot03lp-XjTKBr'; // only work for v2CheckboxXXX

export const GoogleRecaptcha: React.FC = () => {
    const [version, setVersion] = useState<Version>(Version.v2CheckboxAutoRender);
    const modalInfo = useCallback((token: string) => {
        Modal.info({
            title: version + 'Recaptcha Token',
            content: <pre>{token}</pre>
        });
    }, [version]);

    useEffect(() => {
        const script = document.createElement('script');
        let searchParams: URLSearchParams | undefined;
        switch (version) {
            case Version.v2InvisibleAutoBind:
            case Version.v3AutoBind:
                (window as any).onSubmit = (token: string) => {
                    modalInfo(token);
                };

                break;
            case Version.v3MannualInvoke:
                searchParams = new URLSearchParams({
                    render: RecaptchaSiteKey
                });

                break;
            case Version.v2CheckboxAutoRender:
                (window as any).onAutoRenderSuccess = (token: string) => {
                    modalInfo(token);
                };

                break;
            case Version.v2InvisibleManualBind:
            case Version.v2CheckboxExplicitRender:
                searchParams = new URLSearchParams({
                    onload: 'onloadCallback',
                    render: 'explicit'
                });
                (window as any).onloadCallback = () => {
                    (window as any).grecaptcha.render('g-recaptcha', {
                        sitekey: RecaptchaSiteKey
                    });
                };

                break;
            case Version.v2InvisibleManualInvoke:
                break;
        }

        script.src = searchParams ? `${RecaptchaScriptUrl}?${searchParams.toString()}` : RecaptchaScriptUrl;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [version, modalInfo]);

    let versionSpecificContent: React.ReactNode;
    switch (version) {
        case Version.v3AutoBind:
        case Version.v2InvisibleAutoBind:
            versionSpecificContent = (
                <Button
                    className="g-recaptcha"
                    data-sitekey={RecaptchaSiteKey}
                    data-callback='onSubmit'
                    data-action='submit'
                >
                    {version} Submit
                </Button>
            );
            break;
        case Version.v3MannualInvoke:
            versionSpecificContent = (
                <Button
                    onClick={e => {
                        e.preventDefault();
                        (window as any).grecaptcha.ready(async () => {
                            const token:string = await (window as any).grecaptcha.execute(RecaptchaSiteKey, {action: 'submit'});
                            // Add your logic to submit to your backend server here.
                            modalInfo(token);
                        });
                    }}
                >
                    {version} Invoke
                </Button>
            );
            break;
        case Version.v2CheckboxAutoRender:
            versionSpecificContent = (
                <form
                    action="/api/user"
                    method="POST"
                >
                    <div
                        className="g-recaptcha"
                        data-sitekey={RecaptchaSiteKey}
                        data-callback='onAutoRenderSuccess'
                    />
                    <br/>
                    <input
                        type="submit"
                        value={`${version} Submit`}
                    />
                </form>
            );
            break;
        case Version.v2InvisibleManualBind:
        case Version.v2CheckboxExplicitRender:
            versionSpecificContent = (
                <form
                    action="/api/user"
                    method="POST"
                >
                    <div
                        className="g-recaptcha"
                    />
                    <br/>
                    <input
                        type="submit"
                        value={`${version} Submit`}
                    />
                </form>
            );
            break;
        case Version.v2InvisibleManualInvoke:
            versionSpecificContent = (
                <>
                    <div
                        className="g-recaptcha"
                        data-sitekey={RecaptchaSiteKey}
                        data-callback='onSubmit'
                        data-size='invisible'
                    />

                    <Button
                        onClick={async e => {
                            e.preventDefault();
                            const executeRes = await (window as any).grecaptcha.execute();
                            console.log({version, executeRes}); // eslint-disable-line no-console
                            (window as any).grecaptcha.render('g-recaptcha', {
                                sitekey: RecaptchaSiteKey
                            });
                        }}
                    >
                        {version} Execute
                    </Button>
                </>
            );
            break;
    }

    return (
        <Container sx={{py: 5}}>
            <Select
                value={version}
                onChange={setVersion}
                style={{width: 200}}
                options={Object.values(Version).map(value => ({value, label: value}))}
            />

            {versionSpecificContent}
        </Container>
    );
};
