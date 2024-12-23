import {Image} from 'theme-ui';

const SvgOrImage: React.FCC<{
    src: string | React.FCSVG
}> = ({className, src}) => {
    if (typeof src === 'string') {
        return <Image {...{className, src}} />;
    }

    const SvgComp = src;

    return <SvgComp {...{className}} />;
};

export default SvgOrImage;
