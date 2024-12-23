/*
 * @Author: xiaodongyu
 * @Date: 2022-10-20 17:42:30
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-05-08 23:39:55
 */
/* eslint-disable no-console */
import {Component} from 'react';
import {Flex, Heading, Button} from 'theme-ui';

type Props = React.PropsWithChildren<{currentPath?: string}>;
type State = {
    hasError: boolean;
};

export default class ErrorBoundary extends Component<Props> {

    state: State = {
        hasError: false
    };

    static getDerivedStateFromError(error: any) {
        // Update state so the next render will show the fallback UI.
        // alert(error);
        console.error(error);

        return {hasError: true};
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.currentPath !== prevProps.currentPath) {
            this.setState({hasError: false});
        }
    }

    componentDidCatch(error: any, errorInfo: any) {
        // You can also log the error to an error reporting service
        // alert(error);
        // alert(JSON.stringify(errorInfo));
        console.error('error', error);
        console.error('errorInfo', JSON.stringify(errorInfo));
    }

    // auto bind this
    handleTryAgain = () => {
        this.setState({hasError: false});
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <Flex sx={{gap: 5, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: 3}}>
                    <Heading as="h1">
                        Sorry, something went wrong.
                    </Heading>

                    <Button onClick={this.handleTryAgain}>
                        Try Again
                    </Button>
                </Flex>
            );
        }

        return this.props.children;
    }

}
